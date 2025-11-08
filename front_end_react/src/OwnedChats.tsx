import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import { Flex, Heading, Text } from "@radix-ui/themes";
import { useNetworkVariable } from "./networkConfig";

export function OwnedChats() {
  const account = useCurrentAccount();
  const packageId = useNetworkVariable('PACKAGE_ID');
 
  const { data: dataAdminCaps, isPending, error } = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: account?.address as string,
      filter: {
        StructType: `${packageId}::chat_room::RoomAdminCap`
      },
      options: {
        showContent: true,
        showType: true,
        showOwner: true
      }
    },
    {
      enabled: !!account      
    },
  );

  const a = useSuiClientQuery(
    'multiGetObjects',
    { 
      ids: dataAdminCaps?.data.map((adminCap: any) => adminCap.data?.content.fields.room_id) || [],
      options: {
        showContent: true
      }
    },    
  );
  console.log(a);

  if (!account) {
    return;
  }

  if (error) {
    return <Flex>Error: {error.message}</Flex>;
  }

  if (isPending || !dataAdminCaps) {
    return <Flex>Loading...</Flex>;
  }

  return (
    <Flex direction="column" my="2">
      {dataAdminCaps.data.length === 0 ? (
        <Text>No chats owned by the connected wallet</Text>
      ) : (
        <Heading size="4">Chats owned by the connected wallet</Heading>
      )}
      {dataAdminCaps.data.map((object) => (
        <Flex key={object.data?.objectId}>
          <Text>Object ID: {JSON.stringify(object.data)}</Text>
        </Flex>
      ))}
    </Flex>
  );
}
