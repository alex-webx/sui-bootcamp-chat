import { Button, Container } from "@radix-ui/themes";
import { useState } from "react";
import { useNetworkVariable } from "./networkConfig";
import { Transaction } from "@mysten/sui/transactions";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";

export function CreateChatRoom({
  onCreated,
}: {
  onCreated: (id: string) => void;
}) {
  const [waitingForTxn, setWaitingForTxn] = useState(false);
  const packageId = useNetworkVariable('PACKAGE_ID');
  const chatRoomRegistryPackageId = useNetworkVariable('REGISTRY_PACKAGE_ID');
  const suiClient = useSuiClient();

  const {
    mutate: signAndExecute,
    isSuccess,
    isPending,
  } = useSignAndExecuteTransaction();

  function create() {
    try {
      const tx = new Transaction();
      console.log(`${packageId}::chat_room::create_room`);
      tx.moveCall({      
        target: `${packageId}::chat_room::create_room`,
        arguments: [
          tx.object(chatRoomRegistryPackageId),
          tx.pure('string', 'Sala teste'),
          tx.object('0x6')
        ]
      });

      signAndExecute({ transaction: tx }, {
        onSuccess: async ({ digest }) => {
          const transRes = await suiClient.waitForTransaction({
            digest,
            options: {
              showEffects: true
            }
          });
          console.log('created', transRes);
          onCreated(transRes.effects?.created?.[0]?.reference?.objectId!);
        }
      });
    } catch (ex) {
      console.log('err');
      console.log(ex);
    }    
  }

  return (
    <Container>
      <Button
        size="3"
        onClick={() => {
          create();
        }}
        disabled={isSuccess || isPending}
      >
        {isSuccess || isPending ? "Busy..." : "Create new chat room"}
      </Button>
    </Container>
  );
}