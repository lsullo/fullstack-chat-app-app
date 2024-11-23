import { DynamoDB } from "aws-sdk";
import { Handler } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";

const dynamoDB = new DynamoDB.DocumentClient();

const userIndexTable = "UserIndex-zym4s5tojfekjijegwzlhfhur4-NONE";
const groupMessageTable = "GroupMessage-zym4s5tojfekjijegwzlhfhur4-NONE";
const groupTable = "Group-zym4s5tojfekjijegwzlhfhur4-NONE";

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

    console.log("Group chat status updated successfully:", JSON.stringify(updateGroupResult, null, 2));

    
    const newMessageId = uuidv4();

    const newMessage = {
      id: newMessageId,
      groupId,
      content: `ACP ACTIVATED ANTI_GAY ON`,
      userNickname: "LTM",
      type: "system",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log("New group message payload:", newMessage);

    const groupMessageParams = {
      TableName: groupMessageTable,
      Item: newMessage,
    };

    await dynamoDB.put(groupMessageParams).promise();

    console.log("Group message added successfully:", newMessage);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Group message inserted successfully",
        newMessage,
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
