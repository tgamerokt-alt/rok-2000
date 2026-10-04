import Link from "next/link";

/** Governor name as a table link: plain text that gains an underline + accent colour on hover. */
export default function PlayerLink({ governorId, name }: { governorId: string; name: string }) {
  return (
    <Link
      href={`/governor/${governorId}`}
      className="hover:text-amber-600 hover:underline hover:decoration-amber-500 hover:underline-offset-4 dark:hover:text-amber-400"
    >
      {name}
    </Link>
  );
}
