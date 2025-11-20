export type { UserProfileRegistry,UserProfile } from './userProfileModels';
import * as userProfileQuery from './userProfileQuery';
import * as userProfileFunctions from './userProfileFunctions';
export const userProfileModule = {
  ...userProfileQuery,
  ...userProfileFunctions
};
