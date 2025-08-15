import { Box, Button, Checkbox, Container, Table } from "@radix-ui/themes";
import { PenIcon, TrashIcon } from "lucide-react";
import React from "react";
import CreateKeyModal from "./CreateKeyModal";
import DeleteKeyModal from "./DeleteKeyModal";

function ActiveTable({
  activeSnippets,
  setActiveSnippets,
  setSelectedSnippets,
  getSnippets,
  deleteSelectedSnippets,
}) {
  return (
    <Container className="h-full">
      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row align="center">
            {Boolean(activeSnippets.length) &&
              Object.keys(activeSnippets?.[0])?.map(
                (header, index) =>
                  header !== "id" && (
                    <Table.ColumnHeaderCell className="capitalize" key={index}>
                      {header}
                    </Table.ColumnHeaderCell>
                  )
              )}
            <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {activeSnippets.map(
            ({ id, keyName, value, type, ...item }, index) => (
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
                  {value}
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
