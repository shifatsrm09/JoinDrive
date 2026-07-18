export default function Sidebar() {
  return (
    <aside className="w-64 border-r border-zinc-700 bg-[#202020] p-4">
      <h2 className="mb-4 text-lg font-semibold">JoinDrive</h2>

      <nav className="space-y-2">
        <div>🏠 Home</div>
        <div>💾 My Drives</div>
        <div>⭐ Favorites</div>
        <div>🕘 Recent</div>
        <div>🗑️ Trash</div>
      </nav>
    </aside>
  );
}