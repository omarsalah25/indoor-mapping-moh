import * as FileSystem from 'expo-file-system';

const LOG_FILE_PATH = FileSystem.documentDirectory + 'app_logs.txt'; // Use Expo's document directory
console.info(LOG_FILE_PATH)
// Function to log messages
const logMessage = async (message) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;

  try {
    // Check if the file exists
    const fileInfo = await FileSystem.getInfoAsync(LOG_FILE_PATH);
    
    let existingContent = '';
    
    if (fileInfo.exists) {
      // If file exists, read its content
      existingContent = await FileSystem.readAsStringAsync(LOG_FILE_PATH);
    }

    // Combine the existing content with the new log entry
    const newContent = existingContent + logEntry;

    // Write the combined content back to the file
    await FileSystem.writeAsStringAsync(LOG_FILE_PATH, newContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    console.log('Log written:', logEntry); // Optional: to see logs in the console
  } catch (error) {
    console.error('Error logging message:', error);
  }
};

// Function to clear the logs
const clearLogs = async () => {
  try {
    await FileSystem.writeAsStringAsync(LOG_FILE_PATH, '', { encoding: FileSystem.EncodingType.UTF8 });
    console.log('Log file cleared.');
  } catch (error) {
    console.error('Error clearing log file:', error);
  }
};

export { logMessage, clearLogs };
