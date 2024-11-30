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

    console.log(
      "Group chat status updated successfully:",
      JSON.stringify(updateGroupResult, null, 2)
    );

    const lawyerUserId = "4f4bbe96-d20b-4b3b-87b0-09925cf2be4f"; 

    const IndexParams = {
      TableName: userIndexTable,
      IndexName: "userIndicesByUserId",
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": lawyerUserId,
      },
    };

    const paramResult = await dynamoDB.query(IndexParams).promise();

    if (!paramResult.Items || paramResult.Items.length === 0) {
      throw new Error("Lawyer user not found with the provided userId.");
    }

    const paramItem = paramResult.Items[0];
    const paramNickname = paramItem.userNickname || "Unknown Lawyer";

    const newMessageId = uuidv4();
    const newMessageId2 = uuidv4();

    const newMessage = {
      id: newMessageId,
      groupId,
      content: `Attorney Client Privilege Activated`,
      userNickname: "System",
      type: "system",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newMessage2 = {
      id: newMessageId2,
      groupId,
      content: `Hello, my name is Luke the Man. I am an attorney with Sullo and Sullo. 
      Remember to review our terms and conditions so that your chat can be fully protected.
       If you have any questions for me, send me a direct message or reach me at (***-***-****).`,
      userNickname: paramNickname,
      owner: lawyerUserId, 
      type: "text",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const batchWriteParams = {
      RequestItems: {
        [groupMessageTable]: [
          {
            PutRequest: {
              Item: newMessage,
            },
          },
          {
            PutRequest: {
              Item: newMessage2,
            },
          },
        ],
      },
    };

    await dynamoDB.batchWrite(batchWriteParams).promise();

    console.log("Group messages added successfully:", [newMessage, newMessage2]);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Group messages inserted successfully",
        messages: [newMessage, newMessage2],
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
