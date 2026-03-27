interface Pattern {
  id: number;
  name: string;
  designer: { name: string };
  first_photo?: { small_url: string };
  craft?: { name: string };
  yarn_weight?: { name: string };
  free: boolean;
  rating_average: number;
  projects_count: number;
}

export default function PatternCard({ pattern }: { pattern: Pattern }) {
  return (
    <a
      href={`https://www.ravelry.com/patterns/library/${pattern.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-white rounded-lg overflow-hidden border border-gray-100 hover:border-gray-300 hover:shadow-md transition-all group"
    >
      {/* Photo */}
      <div className="aspect-square bg-gray-100 overflow-hidden">
        {pattern.first_photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pattern.first_photo.small_url}
            alt={pattern.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">
            🧶
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="font-medium text-gray-900 text-sm leading-tight line-clamp-2">
          {pattern.name}
        </p>
        <p className="text-xs text-gray-400 mt-1 truncate">{pattern.designer?.name}</p>

        <div className="flex items-center justify-between mt-2">
          <span
            className={`text-xs font-medium px-1.5 py-0.5 rounded ${
              pattern.free
                ? "bg-green-50 text-green-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {pattern.free ? "Free" : "Paid"}
          </span>
          {pattern.projects_count > 0 && (
            <span className="text-xs text-gray-400">
              {pattern.projects_count.toLocaleString()} projects
            </span>
          )}
        </div>
      </div>
    </a>
  );
}
