import FileSystemBrowser from "../components/FileSystemBrowser";
import { ApplyChangesForm } from "../components/apply-changes-form";
import LLMChatbox from "../components/LLMChatbox";
import { Card, CardHeader, CardTitle } from "~/components/ui/card";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <FileSystemBrowser />

      <Card className="w-[90%] max-w-3xl mt-4">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">LLM XML Parser</CardTitle>
        </CardHeader>
        <ApplyChangesForm />
      </Card>

      <Card className="w-[90%] max-w-3xl mt-4">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">LLM Chatbox</CardTitle>
        </CardHeader>
        <LLMChatbox />
      </Card>
    </main>
  );
}