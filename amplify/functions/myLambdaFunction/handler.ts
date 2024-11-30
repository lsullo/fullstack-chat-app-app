import { DynamoDB } from "aws-sdk";
import { Handler } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";

const dynamoDB = new DynamoDB.DocumentClient();

const userIndexTable = "UserIndex-zym4s5tojfekjijegwzlhfhur4-NONE";
const groupMessageTable = "GroupMessage-zym4s5tojfekjijegwzlhfhur4-NONE";
const groupTable = "Group-zym4s5tojfekjijegwzlhfhur4-NONE";
const groupUserTable = "GroupUser-zym4s5tojfekjijegwzlhfhur4-NONE";

const usertobeaddeduserid = '913b3560-e091-7009-9862-dff786bf32e4';

export const handler: Handler = async (event) => {
  try {
    console.log("Received event:", JSON.stringify(event, null, 2));

    const userId = event.detail?.data?.object?.client_reference_id;

    if (!userId) {
      throw new Error("client_reference_id not found in the event data.");
    }

    console.log("Querying UserIndex table with userId:", userId);

    const userIndexParams = {
      TableName: userIndexTable,
      IndexName: "userIndicesByUserId",
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

    const userItem = userResult.Items[0];
    const recentGroupUrl = userItem.recentgroup;

    const groupIdMatch = recentGroupUrl.match(/groups\/([^/]+)/);

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

    // Create a group user entry for usertobeaddeduserid
    const groupUserId = uuidv4();

    const groupUserItem = {
      id: groupUserId,
      groupId: groupId,
      userId: usertobeaddeduserid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const groupUserParams = {
      TableName: groupUserTable,
      Item: groupUserItem,
    };

    await dynamoDB.put(groupUserParams).promise();

    console.log("GroupUser entry added successfully:", groupUserItem);

    // Get userNickname for usertobeaddeduserid from UserIndex table
    const addedUserIndexParams = {
      TableName: userIndexTable,
      IndexName: "userIndicesByUserId",
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": usertobeaddeduserid,
      },
    };

    const addedUserResult = await dynamoDB.query(addedUserIndexParams).promise();

    console.log(
      "Added UserIndex Query Result:",
      JSON.stringify(addedUserResult, null, 2)
    );

    if (!addedUserResult.Items || addedUserResult.Items.length === 0) {
      throw new Error("User to be added not found with the provided userId.");
    }

    const addedUserItem = addedUserResult.Items[0];
    const addedUserNickname = addedUserItem.userNickname || "User";

    // Create a message from usertobeaddeduserid in the recent group
    const newMessageId = uuidv4();

    const userMessage = {
      id: newMessageId,
      groupId,
      content: "Hello, I have been added to the group.",
      userNickname: addedUserNickname,
      userId: usertobeaddeduserid,
      type: "user",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const userMessageParams = {
      TableName: groupMessageTable,
      Item: userMessage,
    };

    await dynamoDB.put(userMessageParams).promise();

    console.log("User message added successfully:", userMessage);

    // Also, add the service message
    const serviceMessageId = uuidv4();

    const serviceMessage = {
      id: serviceMessageId,
      groupId,
      content: "Attorney Client Privilege Activated",
      userNickname: "LTM",
      type: "system",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const serviceMessageParams = {
      TableName: groupMessageTable,
      Item: serviceMessage,
    };

    await dynamoDB.put(serviceMessageParams).promise();

    console.log("Service message added successfully:", serviceMessage);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Group user added and messages inserted successfully",
        groupUserItem,
        userMessage,
        serviceMessage,
      }),
    };
  } catch (error) {
    console.error("Error processing request:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error processing request", error }),
    };
  }
};
