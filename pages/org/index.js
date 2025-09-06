import React, { useState, useEffect } from "react";
import { Box, Heading, Separator, Button, Flex, Grid, Card, Text, DropdownMenu, IconButton, HoverCard, DataList, Badge, Code } from "@radix-ui/themes";
import { PlusIcon, PencilIcon, TrashIcon, EllipsisVerticalIcon, UsersIcon, CopyIcon, EditIcon, Edit2Icon } from "lucide-react";
import CreateOrgModal from "@/components/CreateOrgModal";
import { getLocalStorage, getOrgsAPI, setLocalStorage, updateOrgAPI, duplicateOrgAPI, deleteOrgAPI, inviteUsersAPI } from "@/lib/services";
import { setCookie } from "cookies-next";
import EditOrgModal from "@/components/EditOrgModal";
import DuplicateOrgModal from "@/components/DuplicateOrgModal";
import InviteOrgModal from "@/components/InviteOrgModal";
import DeleteOrgModal from "@/components/DeleteOrgModal";


const Org = () => {
  const [orgs, setOrgs] = useState([]);
  const selectOrg = (org) => {
    setLocalStorage("orgId", org.id);
    // set whole org object to cookies with full structure including expiry and other properties
    setCookie("org", JSON.stringify(org), {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
      secure: false, // Set to true in production with HTTPS
      sameSite: "lax", // or 'none' for cross-site access
    });
    window.location.href = "/";
  };
  const getOrgs = () => {
    const token = getLocalStorage("token")?.split('"')[1];
    if (token) {
      getOrgsAPI(token).then((response) => {
        setOrgs(response);
      });
    }
  };

  useEffect(() => {
    getOrgs();
  }, []);
  return (
    <Box className="w-full lg:max-w-screen-lg mx-auto h-screen overflow-auto py-20 flex flex-col space-y-10">
      <Box className="flex flex-col h-full space-y-3">
        <Flex justify="between">
        <Heading className="text-neutral-600 font-semibold text-2xl">
          Organizations
        </Heading>
        <CreateOrgModal>
        <Button variant="classic">
            <PlusIcon size="20" />
            Create Organization
        </Button>
        </CreateOrgModal>
        </Flex>
        <Separator className="w-full" size="4" />
        <Grid columns="3" gap="4" className="w-full overflow-y-auto">  
            {orgs.map((org) => (
                <HoverCard.Root key={org.id}>
                <HoverCard.Trigger>
                    <Card key={org.id} variant="classic">
                        <Flex direction="column" align="center" justify="between">
                            <Flex className="w-full" direction="row" justify="between" align="start">
                                <Flex direction="column" className="w-full">
                                    <Heading color="gray">{org.name}</Heading>
                                    <Text color="gray">{org.description}</Text>
                                </Flex>
                                <DropdownMenu.Root>
                                    <DropdownMenu.Trigger>
                                        <IconButton variant="ghost">
                                            <EllipsisVerticalIcon width="18" height="18" />
                                        </IconButton>
                                    </DropdownMenu.Trigger>
                                    <DropdownMenu.Content>
                                        <DropdownMenu.Item onClick={(e) => e.preventDefault()}><EditOrgModal org={org}><Flex align="center" gap="2"><Edit2Icon size="16" color="gray" /><Text>Edit</Text></Flex></EditOrgModal></DropdownMenu.Item>
                                        <DropdownMenu.Item onClick={(e) => e.preventDefault()}><DuplicateOrgModal org={org}><Flex align="center" gap="2"><CopyIcon size="16" color="gray" /><Text>Duplicate</Text></Flex></DuplicateOrgModal></DropdownMenu.Item>
                                        <DropdownMenu.Item onClick={(e) => e.preventDefault()}><InviteOrgModal org={org}><Flex align="center" gap="2"><UsersIcon size="16" color="gray" /><Text>Invite</Text></Flex></InviteOrgModal></DropdownMenu.Item>
                                        <DropdownMenu.Item color="red"  onClick={(e) => e.preventDefault()}><DeleteOrgModal org={org}><Flex align="center" gap="2"><TrashIcon size="16" color="red" /><Text color="red">Delete</Text></Flex></DeleteOrgModal></DropdownMenu.Item>
                                    </DropdownMenu.Content>
                                </DropdownMenu.Root>
                            </Flex>
                        </Flex>
                    </Card>
                </HoverCard.Trigger>
                <HoverCard.Content className="w-full">
                    <Flex className="w-full" direction="column" align="center" justify="start" gap="4">
                        <DataList.Root className="w-full">
                            <DataList.Item>
                                <DataList.Label minWidth="88px">ID</DataList.Label>
                                <DataList.Value>
                                    <Badge size="2">
                                        <Code variant="ghost">{org.id}</Code>
                                        <IconButton
                                            size="1"
                                            aria-label="Copy value"
                                            color="lime"
                                            variant="ghost"
                                            ml="4"
                                        >
                                            <CopyIcon size={12}  />
                                        </IconButton>
                                    </Badge>
                                </DataList.Value>
                            </DataList.Item>
                            <DataList.Item>
                                <DataList.Label minWidth="88px"><UsersIcon size="16" /></DataList.Label>
                                <DataList.Value>{org.count}</DataList.Value>
                            </DataList.Item>
                        </DataList.Root>
                        <Separator className="w-full" size="4" />
                        <Button className="min-w-96" variant="ghost" onClick={() => selectOrg(org)}>Enter</Button>
                    </Flex>
                </HoverCard.Content>
            </HoverCard.Root>
            ))}
        </Grid>
      </Box>
    </Box>
  );
};
export default Org;