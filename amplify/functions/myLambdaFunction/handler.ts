import { DynamoDB } from "aws-sdk";
import { Handler } from "aws-lambda";

const dynamoDB = new DynamoDB.DocumentClient();

const tableName = "GroupMessage-zym4s5tojfekjijegwzlhfhur4-NONE"; 

export const handler: Handler = async (event) => {
  try {
    const item = {
      id: "test FN", 
      groupId: '22084a9d-05f2-4752-8a11-b43c33736472', 
      content: `ACP ACTIVATED ANTI_GAY ON`, 
      userNickname: 'LTM', 
      type: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const params = {
      TableName: tableName,
      Item: item,
    };

    // Add the item to the DynamoDB table
    await dynamoDB.put(params).promise();

    console.log("Item added successfully:", item);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Data inserted successfully" }),
    };
  } catch (error) {
    console.error("Error inserting data:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error inserting data" }),
    };
  }
};
