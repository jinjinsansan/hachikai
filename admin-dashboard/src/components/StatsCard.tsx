interface StatsCardProps {
  title: string
  value: number | string
  icon: string
  color: string
}

export default function StatsCard({ title, value, icon, color }: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`flex-shrink-0 ${color} rounded-md p-3 text-white text-2xl`}>
          {icon}
        </div>
        <div className="ml-5">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">
              {title}
            </dt>
            <dd className="text-3xl font-semibold text-gray-900">
              {value}
            </dd>
          </dl>
        </div>
      </div>
    </div>
  )
}