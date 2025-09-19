'use client'

interface FloorChartProps {
  data: number[]
}

export default function FloorChart({ data }: FloorChartProps) {
  const maxValue = Math.max(...data)

  return (
    <div className="flex items-end justify-around h-64">
      {data.map((value, index) => (
        <div key={index} className="flex flex-col items-center">
          <div className="relative">
            <div
              className="bg-orange-500 w-16 rounded-t transition-all duration-300 hover:bg-orange-600"
              style={{
                height: `${(value / maxValue) * 200 || 10}px`,
              }}
            />
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-sm font-semibold">
              {value}
            </div>
          </div>
          <div className="mt-2 text-sm font-medium">
            {index + 1}階
          </div>
        </div>
      ))}
    </div>
  )
}