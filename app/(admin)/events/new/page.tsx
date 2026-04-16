import { NewEventForm } from "./NewEventForm";

export default function NewEventPage(): React.ReactElement {
  return (
    <div className="max-w-xl">
      <h1 className="text-h2 text-text mb-8">New event</h1>
      <NewEventForm />
    </div>
  );
}
