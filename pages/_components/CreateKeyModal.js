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

function CreateKeyModal({ children }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger>{children}</Dialog.Trigger>

      <Dialog.Content maxWidth="450px">
        <Dialog.Title>Create Key</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Create a short and memorable key.
        </Dialog.Description>

        <Flex direction="column" gap="3">
          <label>
            <Text as="div" size="2" mb="1" weight="bold">
              Key
            </Text>
            <TextField.Root placeholder="key" size="3">
              <TextField.Slot>
                <Badge variant="soft" size="3" color="lime">
                  {"//"}
                </Badge>
              </TextField.Slot>
            </TextField.Root>
          </label>
          <label>
            <Text as="div" size="2" mb="1" weight="bold">
              Value
            </Text>
            <TextField.Root placeholder="Keyword" size="3" type="url">
              <TextField.Slot>
                <Select.Root defaultValue="apple">
                  <Select.Trigger size="1" radius="large" variant="soft" />
                  <Select.Content>
                    <Select.Item value="apple">Text</Select.Item>
                    <Select.Item value="orange">Link</Select.Item>
                  </Select.Content>
                </Select.Root>
                <Separator orientation="vertical" />
              </TextField.Slot>
            </TextField.Root>
          </label>
        </Flex>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Dialog.Close>
            <Button>Create</Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export default CreateKeyModal;
