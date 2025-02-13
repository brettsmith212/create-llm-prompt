import FileSystemBrowser from "../components/FileSystemBrowser";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <FileSystemBrowser />
    </main>
  );
}