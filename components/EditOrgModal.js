import {
  Box,
  Button,
  Dialog,
  Flex,
  Text,
  TextField,
} from "@radix-ui/themes";
import React, { useState } from "react";
import {
  getLocalStorage,
  updateOrgAPI,
} from "../lib/services";

function EditOrgModal({ children, org }) {
  const [orgName, setOrgName] = useState(org.name);
  const [orgDescription, setOrgDescription] = useState(org.description);

  const updateOrg = () => {
    const token = getLocalStorage("token")?.split('"')[1];
    const payload = {
      org_id: org.id,
      orgName,
      orgDescription,
    };
    updateOrgAPI(token, payload).then((response) => {
      console.log(response, "updateOrgAPI");
    });
  };

  return (
    <Dialog.Root>
      <Dialog.Trigger className="w-full h-full">{children}</Dialog.Trigger>
      <Dialog.Content maxWidth="450px">
        <Dialog.Title>Edit Org</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Edit the organization name and description.
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
            <Button onClick={updateOrg}>
              Update
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export default EditOrgModal;
