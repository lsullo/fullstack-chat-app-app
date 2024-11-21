import { DynamoDB } from "aws-sdk";
import { Handler } from "aws-lambda";

const dynamoDB = new DynamoDB.DocumentClient();

const userIndexTable = "UserIndex-zym4s5tojfekjijegwzlhfhur4-NONE"; 
const groupMessageTable = "GroupMessage-zym4s5tojfekjijegwzlhfhur4-NONE"; 

export const handler: Handler = async (event) => {
  try {
    
    console.log('Received event:', JSON.stringify(event, null, 2))


    const userId = "710bf5d0-7061-705f-3d39-e3cbda1e138b" //default2004 user

    if (!userId) {
      throw new Error("UserId not found in the request context.");
    }

    const userIndexParams = {
      TableName: userIndexTable,
      Key: {
        userId, 
      },
    };

    const userResult = await dynamoDB.get(userIndexParams).promise();

    if (!userResult.Item || !userResult.Item.recentgroup) {
      throw new Error("Recent group not found for the user.");
    }

    const recentGroupUrl = userResult.Item.recentgroup;

    const groupIdMatch = recentGroupUrl.match(/groups\/([^/]+)/);
    if (!groupIdMatch || groupIdMatch.length < 2) {
      throw new Error("Invalid recent group URL format.");
    }
    const groupId = groupIdMatch[1];

    const newMessage = {
      id: "test FN", //May replace with UID
      groupId, 
      content: `ACP ACTIVATED ANTI_GAY ON`, 
      userNickname: 'LTM', 
      type: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const groupMessageParams = {
      TableName: groupMessageTable,
      Item: newMessage,
    };

    // Add the item to the GroupMessage table
    await dynamoDB.put(groupMessageParams).promise();

    console.log("Group message added successfully:", newMessage);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Group message inserted successfully", newMessage }),
    };
  } catch (error) {
    console.error("Error processing request:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error processing request", error }),
    };
  }
};
