import React from "react";

export default function AvatarStack({ users = [] as { avatarUrl?: string; name?: string }[] }) {
  const list = users.slice(0,3);
  return (
    <div className="flex -space-x-2 items-center">
      {list.map((u, idx) => (
        <div key={idx} className="h-8 w-8 rounded-full border-2 border-white overflow-hidden bg-gray-100 flex items-center justify-center text-sm">
          {u.avatarUrl ? <img src={u.avatarUrl} alt={u.name} className="h-full w-full object-cover"/> : (u.name ? u.name.split(" ").map(s=>s[0]).join("").slice(0,2) : "U")}
        </div>
      ))}
      {users.length > 3 && <div className="h-8 w-8 rounded-full border-2 border-white bg-muted text-xs flex items-center justify-center">+{users.length-3}</div>}
    </div>
  );
}
