import {
  Box,
  Button,
  Container,
  Table,
} from "@radix-ui/themes";
import * as Tooltip from "@radix-ui/react-tooltip";
import { PenIcon, TrashIcon } from "lucide-react";
import React from "react";
import CreateKeyModal from "./CreateKeyModal";
import DeleteKeyModal from "./DeleteKeyModal";

interface Snippet {
  id: string;
  keyName: string;
  value: string;
  type: string;
  'Last Updated': string;
}

interface ActiveTableProps {
  activeSnippets: Snippet[];
  setActiveSnippets: React.Dispatch<React.SetStateAction<Snippet[]>>;
  deleteSelectedSnippets: (id: string) => void;
}

function ActiveTable({
  activeSnippets,
  setActiveSnippets,
  deleteSelectedSnippets,
}: ActiveTableProps) {
  return (
    <Container className="h-full">
      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row align="center">
            {Boolean(activeSnippets.length) &&
              Object.keys(activeSnippets?.[0])?.map(
                (header) =>
                  header !== "id" && (
                    <Table.ColumnHeaderCell className="capitalize" key={header}>
                      {header}
                    </Table.ColumnHeaderCell>
                  )
              )}
            <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {activeSnippets.map(
            ({ id, keyName, value, type, ...item }) => (
              <Table.Row key={id} align="center">
                <Table.RowHeaderCell>{keyName}</Table.RowHeaderCell>
                <Table.Cell
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    lineBreak: "anywhere",
                    whiteSpace: "wrap",
                    lineClamp: 2,
                    maxLines: 2,
                    maxWidth: "200px",
                  }}
                >
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <span style={{ cursor: "pointer" }}>
                        {value?.slice(0, 100)}
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content
                        className="bg-gray-900 text-white px-2 py-1 rounded text-sm max-w-xs break-words"
                        sideOffset={5}
                      >
                        {value}
                        <Tooltip.Arrow className="fill-gray-900" />
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                </Table.Cell>

                <Table.Cell>{type}</Table.Cell>
                <Table.Cell>{item?.["Last Updated"]}</Table.Cell>
                <Table.Cell>
                  <Box className="flex space-x-4">
                    <CreateKeyModal
                      setActiveSnippets={setActiveSnippets}
                      mode="edit"
                      data={{ keyName, value, id }}
                    >
                      <Button variant="soft">
                        <PenIcon size="20" />
                      </Button>
                    </CreateKeyModal>
                    <DeleteKeyModal
                      keyName={keyName}
                      onDelete={() => deleteSelectedSnippets(id)}
                    >
                      <Button variant="soft">
                        <TrashIcon size="20" />
                      </Button>
                    </DeleteKeyModal>
                  </Box>
                </Table.Cell>
              </Table.Row>
            )
          )}
        </Table.Body>
      </Table.Root>
    </Container>
  );
}

export default ActiveTable;