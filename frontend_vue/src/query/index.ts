import { SuiClient, SuiParsedData, getFullnodeUrl } from '@mysten/sui/client';
import _ from 'lodash';
import { useConfig } from '../../configs';

const { getConfig } = useConfig();
const PROFILE_ID = '0x3d032cb4e69e56ce8c7ea7395ae592ad0f1ea95b26b5ca43aa8bdd7f5c2ec396';
const USER_PROFILE_REGISTRY_ID = getConfig('UserProfileRegistryId')!;
const CHAT_ROOM_REGISTRY_ID = getConfig('ChatRoomRegistryId')!;
const PACKAGE_ID = getConfig('PackageId')!;

const REGEX_TABLE = /^0x2::table::Table<(?<keyType>[^,]+),\s*(?<valueType>[^>]+)>$/;
const REGEX_ID = /^0x0*2::object::ID$/;

export class Query {
  private client = new SuiClient({ url: getFullnodeUrl('devnet' )});

  private isIdType = (dataType: string) => !!dataType.match(REGEX_ID);
  private isTableType = (dataType: string) => !!dataType.match(REGEX_TABLE);
  private isAddressType = (dataType: string) => dataType === 'address';

  public async run() {
    console.clear();

    // await this.getObject(PACKAGE_ID);
    // await this.getObject(PROFILE_ID);
    console.log(await this.getObject(USER_PROFILE_REGISTRY_ID));
    // await this.getObject(CHAT_ROOM_REGISTRY_ID);
    console.log(await this.getObject('0xe73044a24aafa477dff2617b69bec201a32bb4e391d127aa4363d0d256b68b00'));
  }

  private async getObject(objetctId: string) {
    const obj = await this.client.getObject({ id: objetctId, options: { showContent: true } });
    let parsedObj;

    if (obj.data?.content?.dataType === 'moveObject') {
      parsedObj = await this.parseMoveObject(obj.data.content)
    } else if (obj.data?.content?.dataType === 'package') {
      parsedObj = await this.parsePackage(obj.data.content);
    }

    return parsedObj;
  }

  private async parseMoveObject(content: Extract<SuiParsedData, { dataType: 'moveObject' }>) {
    const fields = 'fields' in content.fields ? content.fields.fields : content.fields as any;

    let obj = {} as any;
    for (let key of Object.keys(fields)) {
      obj[_.camelCase(key)] = await this.parseMoveObjectFieldValue(fields[key]);
    }
    return obj;
  }

  private async parseMoveObjectFieldValue(field: any) {
    let res: any;
    if (res = await this.getTable(field)) {
      return res;
    }
    return res || field;
  }

  private getTable = async (field: { type: string, fields: any }) => {
    let match: any;
    if (Object.keys(field).length === 2 && 'fields' in field && 'type' in field && (match = field.type.match(REGEX_TABLE))) {
      if (match?.groups) {
        const table = {
          keyType: match.groups.keyType!.trim() as string,
          valueType: match.groups.valueType!.trim() as string,
          tableId: field.fields.id?.id as string,
          tableSize: Number(field.fields.size)
        };

        const { data, hasNextPage, nextCursor } = await this.client.getDynamicFields({ parentId: table.tableId });

        const tableData: any = {};
        for (let row of (data as any)) {
          let key: any;
          let value: any;

          if (this.isAddressType(table.keyType)) {
            key = row?.name?.value;
          } else {
            key = row?.name;
          }

          if (this.isIdType(table.valueType)) {
            let objectId = (await this.getObject(row?.objectId))?.value;
            value = await this.getObject(objectId);
          } else if (this.isAddressType(table.valueType)) {
            value = row;
          } else {
            value = await this.getObject(row.objectId);
          }


          tableData[key] = value;// || row;

        }

        return tableData;
      }
    }
  };

  private async parsePackage(content: Extract<SuiParsedData, { dataType: 'package' }>) {
    return content;
  }
}
