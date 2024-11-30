import { DynamoDB } from "aws-sdk";
import { Handler, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";

// Initialize DynamoDB Document Client
const dynamoDB = new DynamoDB.DocumentClient();

// DynamoDB Table Names
const userIndexTable = "UserIndex-zym4s5tojfekjijegwzlhfhur4-NONE";
const groupMessageTable = "GroupMessage-zym4s5tojfekjijegwzlhfhur4-NONE";
const groupTable = "Group-zym4s5tojfekjijegwzlhfhur4-NONE";
const groupUserTable = "GroupUser-zym4s5tojfekjijegwzlhfhur4-NONE";

// User ID to be added
const userToBeAddedUserId = '913b3560-e091-7009-9862-dff786bf32e4';

// TypeScript Interfaces

interface UserIndex {
  userId: string;
  role: 'Owner' | 'Lawyer' | 'User' | 'VIP';
  userNickname?: string;
  email: string;
  recentgroup?: string;
  photoId?: string;
  bio?: string;
  lockedbio?: string;
}

interface GroupUser {
  id: string;
  groupId: string;
  userId: string;
  role: 'admin' | 'member';
  userNickname?: string;
  email?: string;
}

interface GroupMessage {
  id: string;
  groupId: string;
  content: string;
  userNickname: string;
  type: 'text' | 'image' | 'system';
  picId?: string;
}

export const handler: Handler = async (event): Promise<APIGatewayProxyResult> => {
  try {
    console.log("Received event:", JSON.stringify(event, null, 2));

    // Extracting userId from the event
    const userId = event.detail?.data?.object?.client_reference_id;

    if (!userId) {
      throw new Error("client_reference_id not found in the event data.");
    }

    console.log("Querying UserIndex table with userId:", userId);

    // Query UserIndex table for the initiating user
    const userIndexParams = {
      TableName: userIndexTable,
      IndexName: "userId", // Ensure this matches your actual index name
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
    };

    const userResult = await dynamoDB.query(userIndexParams).promise();

    console.log("UserIndex Query Result:", JSON.stringify(userResult, null, 2));

    if (!userResult.Items || userResult.Items.length === 0) {
      throw new Error("User not found with the provided userId.");
    }

    const userItem = userResult.Items[0] as UserIndex;
    const recentGroupUrl = userItem.recentgroup;

    const groupIdMatch = recentGroupUrl?.match(/groups\/([^/]+)/);

    if (!groupIdMatch || groupIdMatch.length < 2) {
      throw new Error("Invalid recent group URL format.");
    }

    const groupId = groupIdMatch[1];
    console.log("Extracted groupId:", groupId);

    // Update the group chat status to "Activated"
    const updateGroupParams = {
      TableName: groupTable,
      Key: {
        id: groupId,
      },
      UpdateExpression: "SET chatstatus = :activated",
      ExpressionAttributeValues: {
        ":activated": "Activated",
      },
      ReturnValues: "UPDATED_NEW",
    };

    const updateGroupResult = await dynamoDB.update(updateGroupParams).promise();

    console.log(
      "Group chat status updated successfully:",
      JSON.stringify(updateGroupResult, null, 2)
    );

    // Add the service message first
    const serviceMessageId = uuidv4();

    const serviceMessage: GroupMessage = {
      id: serviceMessageId,
      groupId: groupId,
      content: "Attorney Client Privilege Activated",
      userNickname: "LTM",
      type: "system", // Must be 'text', 'image', or 'system' per schema
      // 'picId' is optional and omitted here
    };

    const serviceMessageParams = {
      TableName: groupMessageTable,
      Item: serviceMessage,
    };

    await dynamoDB.put(serviceMessageParams).promise();

    console.log("Service message added successfully:", serviceMessage);

    // Create a group user entry for userToBeAddedUserId
    const groupUserId = uuidv4();

    // Initialize GroupUser with required fields
    const groupUserItem: GroupUser = {
      id: groupUserId,
      groupId: groupId,
      userId: userToBeAddedUserId,
      role: "member", // Assuming 'role' is required and set to 'member'
      // 'userNickname' and 'email' will be added if available
    };

    // Fetch userNickname and email for the user to be added
    const addedUserIndexParams = {
      TableName: userIndexTable,
      IndexName: "userId", // Ensure this matches your actual index name
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userToBeAddedUserId,
      },
    };

    const addedUserResult = await dynamoDB.query(addedUserIndexParams).promise();

    console.log(
      "Added UserIndex Query Result:",
      JSON.stringify(addedUserResult, null, 2)
    );

    if (addedUserResult.Items && addedUserResult.Items.length > 0) {
      const addedUserItem = addedUserResult.Items[0] as UserIndex;
      groupUserItem.userNickname = addedUserItem.userNickname;
      groupUserItem.email = addedUserItem.email;
    } else {
      console.warn("User to be added not found in UserIndex table.");
    }

    const groupUserParams = {
      TableName: groupUserTable,
      Item: groupUserItem,
    };

    await dynamoDB.put(groupUserParams).promise();

    console.log("GroupUser entry added successfully:", groupUserItem);

    // Create a message from userToBeAddedUserId in the recent group
    const userMessageId = uuidv4();

    const userMessage: GroupMessage = {
      id: userMessageId,
      groupId: groupId,
      content: "Hello, I have been added to the group.",
      userNickname: groupUserItem.userNickname || "User",
      type: "text", // Must be 'text', 'image', or 'system'
      // 'picId' is optional and omitted here
    };

    const userMessageParams = {
      TableName: groupMessageTable,
      Item: userMessage,
    };

    await dynamoDB.put(userMessageParams).promise();

    console.log("User message added successfully:", userMessage);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Group user added and messages inserted successfully",
        groupUserItem,
        userMessage,
        serviceMessage,
      }),
    };
  } catch (error: unknown) {
    console.error("Error processing request:", error);

    // Type assertion to extract message if possible
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error processing request", error: errorMessage }),
    };
  }
};
