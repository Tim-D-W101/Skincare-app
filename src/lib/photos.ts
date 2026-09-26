import { File } from 'expo-file-system';

import { logInDevelopment } from '@/lib/errors';

/**
 * Deletes a file the app wrote to its own cache, such as a scan photo once it
 * has been uploaded. Best effort: a file that can't be deleted stays in the
 * app's private cache, which Android clears when it needs space, so there is
 * nothing useful to tell the user.
 */
export function deleteLocalFile(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (error: unknown) {
    logInDevelopment('Could not delete a cached file', error);
  }
}
