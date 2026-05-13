type ReplayEvent = Record<string, any>;

function collectNodeIds(node: any, ids: Set<number>) {
  if (!node || typeof node !== "object") return;
  if (typeof node.id === "number") ids.add(node.id);
  if (Array.isArray(node.childNodes)) {
    node.childNodes.forEach((child) => collectNodeIds(child, ids));
  }
}

function removeNodeIds(node: any, ids: Set<number>) {
  if (!node || typeof node !== "object") return;
  if (typeof node.id === "number") ids.delete(node.id);
  if (Array.isArray(node.childNodes)) {
    node.childNodes.forEach((child) => removeNodeIds(child, ids));
  }
}

function cloneEvent(event: ReplayEvent, data: ReplayEvent) {
  return { ...event, data };
}

export function prepareReplayEvents(events: ReplayEvent[] = []) {
  const ordered = events
    .filter((event) => event && typeof event === "object" && typeof event.type === "number")
    .map((event, index) => ({ event, index }))
    .sort((a, b) => {
      const left = Number(a.event.timestamp || 0);
      const right = Number(b.event.timestamp || 0);
      return left === right ? a.index - b.index : left - right;
    })
    .map(({ event }) => event);

  const fullSnapshotIndex = ordered.findIndex((event) => event.type === 2 && event.data?.node);
  if (fullSnapshotIndex < 0) return [];

  let metaIndex = -1;
  for (let index = fullSnapshotIndex - 1; index >= 0; index -= 1) {
    if (ordered[index].type === 4) {
      metaIndex = index;
      break;
    }
  }

  const replayEvents = metaIndex >= 0
    ? [ordered[metaIndex], ...ordered.slice(fullSnapshotIndex)]
    : ordered.slice(fullSnapshotIndex);

  const knownNodeIds = new Set<number>();
  const sanitized: ReplayEvent[] = [];

  for (const event of replayEvents) {
    if (event.type === 2) {
      knownNodeIds.clear();
      collectNodeIds(event.data?.node, knownNodeIds);
      sanitized.push(event);
      continue;
    }

    if (event.type !== 3 || event.data?.source !== 0) {
      sanitized.push(event);
      continue;
    }

    const data = event.data || {};
    const texts = Array.isArray(data.texts) ? data.texts.filter((item: any) => knownNodeIds.has(item?.id)) : [];
    const attributes = Array.isArray(data.attributes) ? data.attributes.filter((item: any) => knownNodeIds.has(item?.id)) : [];
    const removes = Array.isArray(data.removes)
      ? data.removes.filter((item: any) => knownNodeIds.has(item?.id) && knownNodeIds.has(item?.parentId))
      : [];
    const adds = Array.isArray(data.adds)
      ? data.adds.filter((item: any) => knownNodeIds.has(item?.parentId))
      : [];

    adds.forEach((item: any) => collectNodeIds(item?.node, knownNodeIds));
    removes.forEach((item: any) => {
      if (typeof item?.id === "number") knownNodeIds.delete(item.id);
      removeNodeIds(item?.node, knownNodeIds);
    });

    if (!texts.length && !attributes.length && !removes.length && !adds.length) continue;
    sanitized.push(cloneEvent(event, { ...data, texts, attributes, removes, adds }));
  }

  return sanitized;
}
