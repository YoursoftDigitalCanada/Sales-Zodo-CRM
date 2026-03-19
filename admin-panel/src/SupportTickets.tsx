import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addTicketMessage,
  assignTicket,
  deleteTicket,
  getSupportTeam,
  getSupportTickets,
  updateTicketStatus,
} from './api';
import { createSupportTicketsRealtimeStream } from './supportTicketsRealtime';

type Status = 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

interface SupportTeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface TicketAttachment {
  name: string;
  url: string;
  type?: string;
  size?: string;
}

interface TicketMessage {
  id: string;
  sender: string;
  message: string;
  isStaff: boolean;
  isInternal: boolean;
  createdAt: string;
}

interface TicketActivity {
  id: string;
  type: 'created' | 'reply' | 'internal_note';
  actor: string;
  content: string;
  createdAt: string;
}

interface Ticket {
  id: string;
  ticketId: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: Status;
  priority: Priority;
  category: string;
  requesterName: string;
  requesterEmail: string;
  userId: string | null;
  workspaceId: string;
  assignedTo: string | null;
  assignedToName: string | null;
  messagesCount: number;
  internalNotesCount: number;
  tags: string[];
  attachments: TicketAttachment[];
  messages: TicketMessage[];
  activity: TicketActivity[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  tenant?: {
    id: string;
    name: string;
    slug: string | null;
  } | null;
}

const STATUSES: Status[] = ['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'];

const STATUS_CFG: Record<Status, { label: string; color: string; bg: string; border: string }> = {
  OPEN: { label: 'Open', color: '#2563eb', bg: 'rgba(37,99,235,0.08)', border: '#2563eb' },
  IN_PROGRESS: { label: 'In Progress', color: '#d97706', bg: 'rgba(217,119,6,0.08)', border: '#d97706' },
  WAITING: { label: 'Waiting', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', border: '#7c3aed' },
  RESOLVED: { label: 'Resolved', color: '#059669', bg: 'rgba(5,150,105,0.08)', border: '#059669' },
  CLOSED: { label: 'Closed', color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: '#64748b' },
};

const PRIORITY_CFG: Record<Priority, { color: string; bg: string }> = {
  LOW: { color: '#475569', bg: 'rgba(148,163,184,0.14)' },
  MEDIUM: { color: '#2563eb', bg: 'rgba(37,99,235,0.12)' },
  HIGH: { color: '#ea580c', bg: 'rgba(234,88,12,0.12)' },
  URGENT: { color: '#dc2626', bg: 'rgba(220,38,38,0.14)' },
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function upsertTicket(items: Ticket[], nextTicket: Ticket): Ticket[] {
  const nextItems = [...items];
  const index = nextItems.findIndex((ticket) => ticket.id === nextTicket.id);

  if (index === -1) {
    nextItems.unshift(nextTicket);
  } else {
    nextItems[index] = nextTicket;
  }

  return nextItems.sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [team, setTeam] = useState<SupportTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState<Status | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | Priority>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<'ALL' | 'unassigned' | string>('ALL');
  const [streamState, setStreamState] = useState<'connecting' | 'live' | 'reconnecting'>('connecting');
  const [liveNotice, setLiveNotice] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [noteText, setNoteText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [ticketResult, teamResult] = await Promise.all([getSupportTickets(), getSupportTeam()]);
      setTickets(ticketResult.data || []);
      setTeam(teamResult || []);
    } catch (error) {
      console.error('Failed to load support tickets', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const stopRealtime = createSupportTicketsRealtimeStream({
      onConnected: () => setStreamState('live'),
      onDisconnected: () => setStreamState('reconnecting'),
      onEvent: (event, payload) => {
        const data = payload as { ticket?: Ticket; id?: string };

        if ((event === 'ticket_created' || event === 'ticket_updated') && data.ticket) {
          setTickets((prev) => upsertTicket(prev, data.ticket!));
          setSelectedTicket((prev) => (prev?.id === data.ticket!.id ? data.ticket! : prev));

          if (event === 'ticket_created') {
            setLiveNotice(`${data.ticket.ticketNumber} arrived from ${data.ticket.tenant?.name || 'a workspace'}`);
          }
        }

        if (event === 'ticket_deleted' && data.id) {
          setTickets((prev) => prev.filter((ticket) => ticket.id !== data.id));
          setSelectedTicket((prev) => (prev?.id === data.id ? null : prev));
        }
      },
    });

    const pollInterval = window.setInterval(() => {
      load();
    }, 30000);

    return () => {
      stopRealtime();
      window.clearInterval(pollInterval);
    };
  }, [load]);

  useEffect(() => {
    if (!liveNotice) {
      return;
    }

    const timeout = window.setTimeout(() => setLiveNotice(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [liveNotice]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesSearch =
        !searchQuery ||
        ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.requesterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.requesterEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.tenant?.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriority = priorityFilter === 'ALL' || ticket.priority === priorityFilter;
      const matchesAssignee =
        assigneeFilter === 'ALL' ||
        (assigneeFilter === 'unassigned' ? !ticket.assignedTo : ticket.assignedTo === assigneeFilter);

      return matchesSearch && matchesPriority && matchesAssignee;
    });
  }, [assigneeFilter, priorityFilter, searchQuery, tickets]);

  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter((ticket) => ticket.status === 'OPEN').length,
    inProgress: tickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length,
    waiting: tickets.filter((ticket) => ticket.status === 'WAITING').length,
    resolved: tickets.filter((ticket) => ticket.status === 'RESOLVED' || ticket.status === 'CLOSED').length,
  }), [tickets]);

  const handleStatusChange = async (ticketId: string, newStatus: Status) => {
    try {
      const ticket = await updateTicketStatus(ticketId, newStatus);
      setTickets((prev) => upsertTicket(prev, ticket));
      setSelectedTicket((prev) => (prev?.id === ticket.id ? ticket : prev));
    } catch (error) {
      console.error('Failed to update ticket status', error);
    }
  };

  const handleAssign = async (ticketId: string, assignee: string | null) => {
    try {
      const ticket = await assignTicket(ticketId, assignee);
      setTickets((prev) => upsertTicket(prev, ticket));
      setSelectedTicket((prev) => (prev?.id === ticket.id ? ticket : prev));
    } catch (error) {
      console.error('Failed to assign ticket', error);
    }
  };

  const handleDelete = async (ticketId: string) => {
    if (!window.confirm('Delete this ticket?')) {
      return;
    }

    try {
      await deleteTicket(ticketId);
      setTickets((prev) => prev.filter((ticket) => ticket.id !== ticketId));
      setSelectedTicket((prev) => (prev?.id === ticketId ? null : prev));
    } catch (error) {
      console.error('Failed to delete ticket', error);
    }
  };

  const submitMessage = async (isInternal: boolean) => {
    if (!selectedTicket) {
      return;
    }

    const value = isInternal ? noteText.trim() : replyText.trim();
    if (!value) {
      return;
    }

    try {
      if (isInternal) {
        setIsSubmittingNote(true);
      } else {
        setIsSubmittingReply(true);
      }

      const ticket = await addTicketMessage(selectedTicket.id, { message: value, isInternal });
      setTickets((prev) => upsertTicket(prev, ticket));
      setSelectedTicket(ticket);
      if (isInternal) {
        setNoteText('');
      } else {
        setReplyText('');
      }
    } catch (error) {
      console.error('Failed to send ticket message', error);
    } finally {
      if (isInternal) {
        setIsSubmittingNote(false);
      } else {
        setIsSubmittingReply(false);
      }
    }
  };

  return (
    <div style={{ padding: '2rem', display: 'grid', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>Support Tickets</h1>
            <span
              style={{
                padding: '0.2rem 0.65rem',
                borderRadius: 999,
                fontSize: '0.7rem',
                fontWeight: 700,
                background: streamState === 'live' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.12)',
                color: streamState === 'live' ? '#047857' : '#b45309',
                border: `1px solid ${streamState === 'live' ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.3)'}`,
              }}
            >
              {streamState === 'live' ? 'Live Sync' : 'Reconnecting...'}
            </span>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '6px 0 0' }}>
            Real-time support queue across all workspaces. Drag tickets between columns to update status instantly.
          </p>
        </div>
        <button onClick={load} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {loading ? '⏳' : '🔄'} Refresh
        </button>
      </div>

      {liveNotice && (
        <div
          className="card"
          style={{
            padding: '0.9rem 1rem',
            border: '1px solid rgba(6,182,212,0.25)',
            background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(8,145,178,0.04))',
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>New ticket received: {liveNotice}</span>
          <button onClick={() => setLiveNotice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0891b2' }}>
            Dismiss
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
        {[
          { label: 'Total', value: stats.total, color: '#06b6d4' },
          { label: 'Open', value: stats.open, color: '#2563eb' },
          { label: 'In Progress', value: stats.inProgress, color: '#d97706' },
          { label: 'Waiting', value: stats.waiting, color: '#7c3aed' },
          { label: 'Resolved', value: stats.resolved, color: '#059669' },
        ].map((stat) => (
          <div key={stat.label} className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: '1rem', display: 'grid', gridTemplateColumns: '1.5fr 180px 220px', gap: '0.75rem' }}>
        <div style={{ position: 'relative' }}>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by subject, ticket number, requester, or tenant..."
            style={{
              width: '100%',
              padding: '0.7rem 0.9rem',
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              fontSize: '0.85rem',
              color: 'var(--text)',
            }}
          />
        </div>
        <select
          value={priorityFilter}
          onChange={(event) => setPriorityFilter(event.target.value as 'ALL' | Priority)}
          style={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', padding: '0 0.75rem' }}
        >
          <option value="ALL">All priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
        <select
          value={assigneeFilter}
          onChange={(event) => setAssigneeFilter(event.target.value)}
          style={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', padding: '0 0.75rem' }}
        >
          <option value="ALL">All assignees</option>
          <option value="unassigned">Unassigned</option>
          {team.map((member) => (
            <option key={member.id} value={member.email}>
              {member.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '1rem', minHeight: 'calc(100vh - 340px)' }}>
        {STATUSES.map((status) => {
          const config = STATUS_CFG[status];
          const columnTickets = filteredTickets.filter((ticket) => ticket.status === status);

          return (
            <div key={status} style={{ flex: 1, minWidth: 280, maxWidth: 340, display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '0.9rem',
                  borderRadius: '12px 12px 0 0',
                  background: config.bg,
                  borderBottom: `2px solid ${config.border}`,
                }}
              >
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: config.border }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: config.color }}>{config.label}</span>
                <span
                  style={{
                    marginLeft: 'auto',
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    background: 'rgba(255,255,255,0.55)',
                    color: config.color,
                  }}
                >
                  {columnTickets.length}
                </span>
              </div>
              <div
                style={{
                  flex: 1,
                  padding: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  borderRadius: '0 0 12px 12px',
                  minHeight: 180,
                  border: `1px solid ${dragOver === status ? '#14b8a6' : 'var(--border)'}`,
                  borderTop: 'none',
                  background: dragOver === status ? 'rgba(20,184,166,0.07)' : 'rgba(248,250,252,0.55)',
                  boxShadow: dragOver === status ? '0 0 0 2px rgba(20,184,166,0.15)' : 'none',
                  transition: 'all 0.15s ease',
                  overflowY: 'auto',
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(status);
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragOver(null);
                  const ticketId = event.dataTransfer.getData('ticketId');
                  const fromStatus = event.dataTransfer.getData('fromStatus') as Status;
                  if (ticketId && fromStatus !== status) {
                    handleStatusChange(ticketId, status);
                  }
                }}
              >
                {columnTickets.length === 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: 92,
                      borderRadius: 10,
                      border: '2px dashed rgba(20,184,166,0.18)',
                      color: '#94a3b8',
                      fontSize: '0.75rem',
                    }}
                  >
                    Drop tickets here
                  </div>
                ) : columnTickets.map((ticket) => {
                  const priority = PRIORITY_CFG[ticket.priority];
                  return (
                    <div
                      key={ticket.id}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData('ticketId', ticket.id);
                        event.dataTransfer.setData('fromStatus', ticket.status);
                      }}
                      onClick={() => setSelectedTicket(ticket)}
                      className="card"
                      style={{
                        padding: '0.85rem',
                        cursor: 'grab',
                        borderLeft: `3px solid ${config.border}`,
                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: '#94a3b8' }}>{ticket.ticketNumber}</span>
                        <span
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: 999,
                            background: priority.bg,
                            color: priority.color,
                          }}
                        >
                          {ticket.priority}
                        </span>
                        {ticket.tenant && (
                          <span
                            style={{
                              marginLeft: 'auto',
                              fontSize: '0.6rem',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: 999,
                              background: 'rgba(6,182,212,0.1)',
                              color: '#0891b2',
                            }}
                          >
                            {ticket.tenant.name}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, lineHeight: 1.35 }}>{ticket.subject}</div>
                      <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: 4, lineHeight: 1.45 }}>{ticket.description}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontWeight: 700,
                              fontSize: '0.58rem',
                            }}
                          >
                            {getInitials(ticket.requesterName)}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 600 }}>{ticket.requesterName}</div>
                            <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>{ticket.assignedToName || 'Unassigned'}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.65rem', color: '#94a3b8' }}>
                          <div>💬 {ticket.messagesCount}</div>
                          <div>{timeAgo(ticket.updatedAt)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selectedTicket && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 460,
              background: 'var(--card-bg)',
              borderLeft: '1px solid var(--border)',
              zIndex: 100,
              overflowY: 'auto',
              boxShadow: '-8px 0 24px rgba(15,23,42,0.12)',
            }}
          >
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'grid', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#94a3b8' }}>{selectedTicket.ticketNumber}</div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '4px 0 0' }}>{selectedTicket.subject}</h2>
                </div>
                <button onClick={() => setSelectedTicket(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 18 }}>
                  ✕
                </button>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, background: STATUS_CFG[selectedTicket.status].bg, color: STATUS_CFG[selectedTicket.status].color }}>
                  {STATUS_CFG[selectedTicket.status].label}
                </span>
                <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, background: PRIORITY_CFG[selectedTicket.priority].bg, color: PRIORITY_CFG[selectedTicket.priority].color }}>
                  {selectedTicket.priority}
                </span>
                <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, background: 'rgba(6,182,212,0.1)', color: '#0891b2' }}>
                  {selectedTicket.tenant?.name || 'Unknown workspace'}
                </span>
              </div>
            </div>

            <div style={{ padding: '1.25rem', display: 'grid', gap: '1.1rem' }}>
              <div className="card" style={{ padding: '1rem', display: 'grid', gap: '0.45rem' }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>Requester</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700 }}>{selectedTicket.requesterName}</div>
                <div style={{ fontSize: '0.8rem', color: '#06b6d4' }}>{selectedTicket.requesterEmail}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Created {new Date(selectedTicket.createdAt).toLocaleString()}</div>
              </div>

              <div className="card" style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>Assignment</div>
                <select
                  value={selectedTicket.assignedTo || ''}
                  onChange={(event) => handleAssign(selectedTicket.id, event.target.value || null)}
                  style={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', padding: '0.7rem' }}
                >
                  <option value="">Unassigned</option>
                  {team.map((member) => (
                    <option key={member.id} value={member.email}>
                      {member.name}
                    </option>
                  ))}
                </select>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {STATUSES.map((status) => (
                    <button
                      key={status}
                      disabled={selectedTicket.status === status}
                      onClick={() => handleStatusChange(selectedTicket.id, status)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 999,
                        border: `1px solid ${STATUS_CFG[status].border}`,
                        background: selectedTicket.status === status ? STATUS_CFG[status].bg : 'transparent',
                        color: STATUS_CFG[status].color,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: selectedTicket.status === status ? 'default' : 'pointer',
                        opacity: selectedTicket.status === status ? 0.6 : 1,
                      }}
                    >
                      {STATUS_CFG[status].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="card" style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>Description</div>
                <div style={{ fontSize: '0.88rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{selectedTicket.description}</div>
              </div>

              {selectedTicket.attachments.length > 0 && (
                <div className="card" style={{ padding: '1rem', display: 'grid', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>Attachments</div>
                  {selectedTicket.attachments.map((attachment) => (
                    <a
                      key={`${selectedTicket.id}-${attachment.url}`}
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        padding: '0.75rem',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        textDecoration: 'none',
                        color: 'var(--text)',
                        background: 'rgba(6,182,212,0.04)',
                      }}
                    >
                      <span>{attachment.name}</span>
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{attachment.size || 'Open'}</span>
                    </a>
                  ))}
                </div>
              )}

              <div className="card" style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>Conversation & Activity</div>
                <div style={{ display: 'grid', gap: '0.6rem', maxHeight: 260, overflowY: 'auto' }}>
                  {selectedTicket.activity.map((entry) => (
                    <div
                      key={entry.id}
                      style={{
                        padding: '0.75rem',
                        borderRadius: 10,
                        background: entry.type === 'internal_note' ? 'rgba(124,58,237,0.08)' : 'rgba(248,250,252,0.9)',
                        border: `1px solid ${entry.type === 'internal_note' ? 'rgba(124,58,237,0.16)' : 'var(--border)'}`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                          {entry.actor}
                          {entry.type === 'internal_note' ? ' • Internal' : ''}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{timeAgo(entry.createdAt)}</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{entry.content}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>Send public reply</div>
                <textarea
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  rows={4}
                  placeholder="Reply back to the customer..."
                  style={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', padding: '0.75rem', resize: 'vertical' }}
                />
                <button onClick={() => submitMessage(false)} className="btn btn-primary" disabled={!replyText.trim() || isSubmittingReply}>
                  {isSubmittingReply ? 'Sending...' : 'Send Reply'}
                </button>
              </div>

              <div className="card" style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>Add internal note</div>
                <textarea
                  value={noteText}
                  onChange={(event) => setNoteText(event.target.value)}
                  rows={3}
                  placeholder="Add a note visible only to the admin team..."
                  style={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', padding: '0.75rem', resize: 'vertical' }}
                />
                <button onClick={() => submitMessage(true)} className="btn btn-outline" disabled={!noteText.trim() || isSubmittingNote}>
                  {isSubmittingNote ? 'Saving...' : 'Save Internal Note'}
                </button>
              </div>

              <button
                onClick={() => handleDelete(selectedTicket.id)}
                style={{
                  padding: '0.8rem',
                  borderRadius: 10,
                  border: '1px solid rgba(220,38,38,0.28)',
                  background: 'rgba(220,38,38,0.06)',
                  color: '#dc2626',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Delete Ticket
              </button>
            </div>
          </div>

          <div
            onClick={() => setSelectedTicket(null)}
            style={{
              position: 'fixed',
              inset: 0,
              right: 460,
              background: 'rgba(15,23,42,0.08)',
              zIndex: 99,
            }}
          />
        </>
      )}
    </div>
  );
}
