import FileSystemBrowser from "../components/FileSystemBrowser";
import { ApplyChangesForm } from "../components/apply-changes-form";
import { Card } from "~/components/ui/card";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <FileSystemBrowser />

      <Card className="w-[90%] max-w-3xl mt-4">
        <ApplyChangesForm />
      </Card>
    </main>
  );
}