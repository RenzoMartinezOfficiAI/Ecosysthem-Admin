import { useHouses } from "../src/hooks/useHouses";

export function HousesPage() {
  const { houses, loading, error } = useHouses();

  if (loading) return <div>Loading houses…</div>;
  if (error) return <div>Error loading houses: {error.message}</div>;

  if (!houses.length) {
    return (
      <div>
        No houses found. Make sure the "houses" collection in Firestore has at
        least one document with fields: name, address, capacity, status.
      </div>
    );
  }

  return (
    <div>
      <h1>Houses</h1>
      {houses.map((h) => (
        <div key={h.id}>
          <h2>{h.name}</h2>
          <p>{h.address}</p>
          <p>Capacity: {h.capacity}</p>
          <p>Status: {h.status}</p>
        </div>
      ))}
    </div>
  );
}