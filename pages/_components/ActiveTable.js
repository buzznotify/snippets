import { Box, Button, Checkbox, Container, Table } from "@radix-ui/themes";
import { CheckIcon, PenIcon, TrashIcon, XIcon } from "lucide-react";
import React from "react";
import CreateKeyModal from "./CreateKeyModal";
import DeleteKeyModal from "./DeleteKeyModal";

function ActiveTable({ tableData }) {
  return (
    <Container className="h-full">
      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row align="center">
            <Table.ColumnHeaderCell>
              <Checkbox variant="surface" defaultChecked />
            </Table.ColumnHeaderCell>
            {Boolean(tableData) &&
              Object.keys(tableData?.[0])?.map(
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
          {tableData.map(
            ({ id, key, value, type, analytics, ...item }, index) => (
              <Table.Row key={id} align="center">
                <Table.RowHeaderCell>
                  <Checkbox variant="surface" defaultChecked />
                </Table.RowHeaderCell>
                <Table.RowHeaderCell>{key}</Table.RowHeaderCell>
                <Table.Cell>{value}</Table.Cell>
                <Table.Cell>{type}</Table.Cell>
                <Table.Cell>{item?.["last updated"]}</Table.Cell>
                <Table.Cell>
                  {analytics ? <CheckIcon size="20" /> : <XIcon size="20" />}
                </Table.Cell>
                <Table.Cell>
                  <Box className="flex space-x-4">
                    <CreateKeyModal>
                      <Button variant="soft">
                        <PenIcon size="20" />
                      </Button>
                    </CreateKeyModal>
                    <DeleteKeyModal keyName={key}>
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
