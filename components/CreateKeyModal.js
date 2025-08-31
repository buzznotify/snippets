import {
  Badge,
  Box,
  Button,
  Dialog,
  Flex,
  Select,
  Separator,
  Text,
  TextField,
} from "@radix-ui/themes";
import React, { useEffect, useState } from "react";
import {
  createSnippetAPI,
  getLocalStorage,
  updateSnippetAPI,
} from "../lib/services";

function CreateKeyModal({ children, mode = "view", data, setActiveSnippets }) {
  const [snippetKey, setSnippetKey] = useState("");
  const [snippetValue, setSnippetValue] = useState("");
  const [snippetType, setSnippetType] = useState("text");
  useEffect(() => {
    if (mode === "edit") {
      setSnippetKey(data.keyName);
      setSnippetValue(data.value);
    }
  }, [mode, data]);
  const updateSnippet = () => {
    const token = getLocalStorage("token")?.split('"')[1];
    const payload = {
      snippet_id: data.id,
      keyName: snippetKey,
      value: snippetValue,
      type: snippetType,
    };
    updateSnippetAPI(token, payload).then((response) => {
      console.log(response, "updateSnippetAPI");
      setActiveSnippets((prev) => {
        return prev.map((item) => {
          if (item.id === data.id) {
            return response;
          }
          return item;
        });
      });
    });
  };
  const createSnippet = () => {
    const token = getLocalStorage("token")?.split('"')[1];
    const payload = {
      keyName: snippetKey,
      value: snippetValue,
      type: snippetType,
    };
    createSnippetAPI(token, payload).then((response) => {
      console.log(response, "createSnippetAPI");
      setActiveSnippets((prev) => {
        return [...prev, response];
      });
    });
  };
  return (
    <Dialog.Root>
      <Dialog.Trigger>{children}</Dialog.Trigger>

      <Dialog.Content maxWidth="450px">
        <Dialog.Title>Create Key</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Create a short and memorable key.
        </Dialog.Description>

        <Flex direction="column" gap="3">
          <Box>
            <Text as="div" size="2" mb="1" weight="bold">
              Key
            </Text>
            <TextField.Root
              autoFocus={true}
              onChange={(val) => setSnippetKey(val.target.value)}
              value={snippetKey}
              placeholder="key"
              size="3"
            >
              <TextField.Slot>
                <Badge variant="soft" size="3" color="lime">
                  {"//"}
                </Badge>
              </TextField.Slot>
            </TextField.Root>
          </Box>
          <Box>
            <Text as="div" size="2" mb="1" weight="bold">
              Value
            </Text>
            <TextField.Root
              onChange={(val) => setSnippetValue(val.target.value)}
              value={snippetValue}
              placeholder="Keyword"
              size="3"
              type="url"
            >
              <TextField.Slot>
                <Select.Root
                  defaultValue="text"
                  onValueChange={(val) => setSnippetType(val)}
                >
                  <Select.Trigger size="1" radius="large" variant="soft" />
                  <Select.Content>
                    <Select.Item value="text">Text</Select.Item>
                    <Select.Item value="url">URL</Select.Item>
                  </Select.Content>
                </Select.Root>
                <Separator orientation="vertical" />
              </TextField.Slot>
            </TextField.Root>
          </Box>
        </Flex>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Dialog.Close>
            <Button onClick={mode === "edit" ? updateSnippet : createSnippet}>
              {mode === "edit" ? "Update" : "Create"}
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export default CreateKeyModal;
