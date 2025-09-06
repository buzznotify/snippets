import {
  Box,
  Button,
  Dialog,
  Flex,
  Text,
  TextField,
  Badge,
} from "@radix-ui/themes";
import React, { useState } from "react";
import {
  getLocalStorage,
  duplicateOrgAPI,
} from "../lib/services";

function DuplicateOrgModal({ children, org }) {
  const [orgName, setOrgName] = useState(org.name);
  const [orgDescription, setOrgDescription] = useState(org.description);

  const duplicateOrg = () => {
    const token = getLocalStorage("token")?.split('"')[1];
    const payload = {
      org_id: org.id,
      orgName,
      orgDescription,
    };
    duplicateOrgAPI(token, payload).then((response) => {
      console.log(response, "duplicateOrgAPI");
    });
  };
  return (
    <Dialog.Root>
      <Dialog.Trigger className="w-full h-full">{children}</Dialog.Trigger>
      <Dialog.Content maxWidth="450px">
        <Dialog.Title>Duplicate Org</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          This will create a new organization with the same properties of <Badge>{org.name}({org.id})</Badge>.
        </Dialog.Description>

        <Flex direction="column" gap="3">
          <Box>
            <Text as="div" size="2" mb="1" weight="bold">
              Name
            </Text>
            <TextField.Root
              autoFocus={true}
              onChange={(val) => setOrgName(val.target.value)}
              value={orgName}
              placeholder="Name"
              size="3"
            />
          </Box>
          <Box>
            <Text as="div" size="2" mb="1" weight="bold">
              Description
            </Text>
            <TextField.Root
              onChange={(val) => setOrgDescription(val.target.value)}
              value={orgDescription}
              placeholder="Description"
              size="3"
            />
          </Box>
        </Flex>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Dialog.Close>
            <Button onClick={duplicateOrg}>
              Duplicate
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export default DuplicateOrgModal;
