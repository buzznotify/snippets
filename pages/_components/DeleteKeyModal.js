import {
  Badge,
  Button,
  CheckboxCards,
  Dialog,
  Flex,
  Select,
  Separator,
  Text,
  TextField,
} from "@radix-ui/themes";
import { PlusIcon } from "lucide-react";
import React from "react";

function DeleteKeyModal({ children, keyName }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger>{children}</Dialog.Trigger>

      <Dialog.Content maxWidth="450px">
        <Dialog.Title>
          Delete
          <Badge size="3" mx="1">
            {"//"}
            {keyName}
          </Badge>
          ?
        </Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Clicking on delete, will permanently delete your key!
        </Dialog.Description>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Dialog.Close>
            <Button color="red">Delete</Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export default DeleteKeyModal;
