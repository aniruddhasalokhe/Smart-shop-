export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-8 w-full max-w-[1400px] mx-auto animate-fade-in p-4">
      {/* Top Navigation Skeleton */}
      <div className="flex justify-between items-center glass-panel" style={{ padding: '1rem 1.5rem', borderRadius: '12px' }}>
        <div className="flex items-center gap-3">
          <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 8 }}></div>
          <div className="skeleton" style={{ width: 220, height: 28, borderRadius: 4 }}></div>
        </div>
        <div className="skeleton" style={{ width: 100, height: 36, borderRadius: 6 }}></div>
      </div>

      {/* KPI Stats Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="glass-panel" style={{ height: 130 }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 8 }}></div>
              <div className="skeleton" style={{ width: '60%', height: 16, borderRadius: 4 }}></div>
            </div>
            <div className="skeleton" style={{ width: '40%', height: 32, borderRadius: 4 }}></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-panel" style={{ height: 'auto' }}>
           <div className="skeleton mb-6" style={{ width: 250, height: 24, borderRadius: 4 }}></div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                 <div key={i} className="skeleton" style={{ height: 160, borderRadius: 12 }}></div>
              ))}
           </div>
        </div>
        <div className="lg:col-span-1 glass-panel" style={{ height: 500 }}>
           <div className="skeleton mb-6" style={{ width: 200, height: 24, borderRadius: 4 }}></div>
           <div className="flex flex-col gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                 <div key={i} className="skeleton" style={{ height: 48, borderRadius: 6 }}></div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
