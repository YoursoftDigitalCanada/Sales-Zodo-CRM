import React from 'react';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { LeaveBalance } from './types';
import { getLeaveTypeConfig } from './utils';

interface LeaveBalanceCardProps {
  balances: LeaveBalance[];
}

export const LeaveBalanceCard: React.FC<LeaveBalanceCardProps> = ({ balances }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Leave Balance</h3>
      
      <div className="space-y-5">
        {balances.map((balance) => {
          const config = getLeaveTypeConfig(balance.type);
          const usedPercentage = (balance.used / balance.total) * 100;
          const pendingPercentage = (balance.pending / balance.total) * 100;

          return (
            <div key={balance.type} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{config.icon}</span>
                  <span className="font-medium text-gray-700">{config.label}</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-gray-900">
                    {balance.available}
                  </span>
                  <span className="text-gray-400 text-sm"> / {balance.total} days</span>
                </div>
              </div>
              
              <div className="relative">
                <Progress value={usedPercentage + pendingPercentage} className="h-2" />
                <div 
                  className="absolute top-0 left-0 h-2 bg-amber-400 rounded-full"
                  style={{ 
                    width: `${pendingPercentage}%`,
                    marginLeft: `${usedPercentage}%`
                  }}
                />
              </div>
              
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#23D3EE]" />
                  <span>Used: {balance.used}</span>
                </div>
                {balance.pending > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>Pending: {balance.pending}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-gray-200" />
                  <span>Available: {balance.available}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};