"use client";
import {
  ChangeEvent,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Checkbox } from "../components/ui/checkbox";

interface TreeNode {
  path: string;
  name: string;
  type: "file" | "directory";
  children?: TreeNode[];
  selected: boolean;
}

async function generateFileSystemTree(
  handle: FileSystemDirectoryHandle,
  path: string = "",
  initialSelection: string[] = []
): Promise<TreeNode[]> {
  const nodes: TreeNode[] = [];

  try {
    for await (const entry of handle.values()) {
      const entryPath = `${path}/${entry.name}`;

      if (entry.kind === 'directory') {
        const dirHandle = await handle.getDirectoryHandle(entry.name);
        const children = await generateFileSystemTree(dirHandle, entryPath, initialSelection);
        const isSelected = initialSelection.includes(entryPath);
        nodes.push({
          path: entryPath,
          name: entry.name,
          type: "directory",
          children: children,
          selected: isSelected,
        });
      } else {
        const isSelected = initialSelection.includes(entryPath);
        nodes.push({
          path: entryPath,
          name: entry.name,
          type: "file",
          selected: isSelected,
        });
      }
    }
    return nodes;
  } catch (error) {
    console.error("Error generating file system tree:", error);
    return [];
  }
}

interface TreeViewProps {
  tree: TreeNode[];
  onChange: (path: string, selected: boolean) => void;
  expandedFolders: { [path: string]: boolean };
  onToggle: (path: string) => void;
}
const TreeView = ({ tree, onChange, expandedFolders, onToggle }: TreeViewProps) => {
  if (!tree) {
    return null;
  }

  return (
    <ul>
      {tree.map((node) => (
        <li key={node.path}>
          {node.type === "directory" ? (
            <div>
              <label className="flex items-center space-x-2">
                <button onClick={() => onToggle(node.path)} className="mr-2">
                  {expandedFolders[node.path] ? "[-]" : "[+]"}
                </button>
                <Checkbox
                  checked={node.selected}
                  onCheckedChange={(checked) => onChange(node.path, checked)}
                />
                <span>{node.name}</span>
              </label>
              {expandedFolders[node.path] && node.children && (
                <div className="ml-4">
                  <TreeView tree={node.children} onChange={onChange} expandedFolders={expandedFolders} onToggle={onToggle} />
                </div>
              )}
            </div>
          ) : (
            <label className="flex items-center space-x-2">
              <Checkbox
                checked={node.selected}
                onCheckedChange={(checked) => onChange(node.path, checked)}
              />
              <span>{node.name}</span>
            </label>
          )}
        </li>
      ))}
    </ul>
  );
};

const FileSystemBrowser = () => {
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [fileSystemTree, setFileSystemTree] = useState<TreeNode[] | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<{ [path: string]: boolean }>({});
  const [promptFileHandle, setPromptFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [promptFileName, setPromptFileName] = useState<string>("");
  const [promptFileContent, setPromptFileContent] = useState<string>("");

  const handleDirectorySelect = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      setDirectoryHandle(handle);
      const tree = await generateFileSystemTree(handle);
      setFileSystemTree(tree);
      setExpandedFolders({}); // Reset expanded folders on new directory selection
    } catch (error) {
      console.error("Error selecting directory:", error);
    }
  };

    const handleClearSelectedFolder = () => {
        setDirectoryHandle(null);
        setFileSystemTree(null);
        setSelectedPaths([]);
        setExpandedFolders({});
        setPromptFileHandle(null);
        setPromptFileName("");
        setPromptFileContent("");
    };

  const handleNodeSelectionChange = (path: string, selected: boolean) => {
    function updateNode(node: TreeNode, selected: boolean): TreeNode {
      return { ...node, selected: selected };
    }

    function updateTree(tree: TreeNode[], path: string, selected: boolean): TreeNode[] {
      return tree.map(node => {
        // Update the selected state of the current node
        if (node.path === path || node.path.startsWith(path + '/')) {
          node = updateNode(node, selected);
        }

        // If it's a directory, recursively update all children
        if (node.type === "directory" && node.children) {
          node.children = updateTree(node.children, path, selected);
        }
        return node;
      });
    }

    if (fileSystemTree) {
      const updatedTree = updateTree(fileSystemTree, path, selected);
      setFileSystemTree(updatedTree);

      // Update selected paths state
      const updatedSelectedPaths = updatedTree.reduce((acc: string[], node) => {
        function collectSelectedPaths(node: TreeNode) {
          if (node.selected) {
            acc.push(node.path);
          }
          if (node.type === "directory" && node.children) {
            node.children.forEach(collectSelectedPaths);
          }
        }
        collectSelectedPaths(node);
        return acc;
      }, []);

      setSelectedPaths(updatedSelectedPaths);
    }
  };

    const handleToggleFolder = (path: string) => {
        setExpandedFolders((prev) => ({ ...prev, [path]: !prev[path] }));
    };

  const handlePromptFileSelect = async () => {
    try {
      const [fileHandle] = await window.showOpenFilePicker();
      const file = await fileHandle.getFile();
      const fileContent = await file.text();

      setPromptFileHandle(fileHandle);
      setPromptFileName(file.name);
      setPromptFileContent(fileContent);
    } catch (error) {
      console.error("Error selecting prompt file:", error);
    }
  };

    const handleClearPromptFile = () => {
        setPromptFileHandle(null);
        setPromptFileName("");
        setPromptFileContent("");
    };

  const handleCopySelectedFiles = async () => {
    if (!fileSystemTree || !directoryHandle) {
      alert("No files selected or tree generated");
      return;
    }

    let content = "";

    if (promptFileContent) {
      content = `\n--- Prompt Instruction: ${promptFileName} ---\n${promptFileContent}\n\n`;
    }

    async function traverseTree(nodes: TreeNode[], currentHandle: FileSystemDirectoryHandle) {
      for (const node of nodes) {
        if (node.selected) {
          if (node.type === "file") {
            try {
              const fileHandle = await currentHandle.getFileHandle(node.name);
              const file = await fileHandle.getFile();
              const fileContent = await file.text();
              content += `\n\n--- ${node.path} ---\n${fileContent}`;
            } catch (error) {
              console.error(`Error reading file ${node.path}:`, error);
              alert(`Error reading file ${node.path}`);
            }
          } else if (node.type === "directory" && node.children) {
            const dirHandle = await currentHandle.getDirectoryHandle(node.name);
            await traverseTree(node.children, dirHandle);
          }
        }
      }
    }

    await traverseTree(fileSystemTree, directoryHandle);

    if (content) {
      try {
        await navigator.clipboard.writeText(content);
        alert("File contents copied to clipboard!");
      } catch (error) {
        console.error("Error copying to clipboard:", error);
        alert("Failed to copy to clipboard: " + error);
      }
    } else {
      alert("No file content to copy.");
    }
  };

  return (
    <div className="container mx-auto mt-8 p-4">
      <h1 className="text-2xl font-bold mb-4">File System Browser</h1>

      {/* Prompt Instruction File Selection */}
      <div className="flex items-center mb-4">
        <Button variant="outline" onClick={handlePromptFileSelect}>
          Select Prompt Instruction File
        </Button>
        {promptFileName && (
          <Button variant="destructive" onClick={handleClearPromptFile}>
            Clear Selected File
          </Button>
        )}
        {promptFileName && <span className="ml-4">Selected: {promptFileName}</span>}
      </div>

      <div className="flex items-center mb-4">
        <Button variant="outline" onClick={handleDirectorySelect}>
          Select Directory
        </Button>
            {directoryHandle && (
                <Button variant="destructive" onClick={handleClearSelectedFolder}>
                    Clear Selected Folder
                </Button>
            )}
        {directoryHandle && <span className="ml-4">Selected: {directoryHandle.name}</span>}
      </div>

      {fileSystemTree && (
        <div className="mt-4">
          <TreeView
            tree={fileSystemTree}
            onChange={handleNodeSelectionChange}
            expandedFolders={expandedFolders}
            onToggle={handleToggleFolder}
          />
        </div>
      )}

      <Button onClick={handleCopySelectedFiles} disabled={!fileSystemTree}>
        Copy Selected File Contents
      </Button>
    </div>
  );
};

export default FileSystemBrowser;