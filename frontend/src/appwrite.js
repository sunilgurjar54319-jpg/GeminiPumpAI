import { Client, Account, Storage } from "appwrite";

export const client = new Client()
  .setEndpoint("https://fra.cloud.appwrite.io/v1")
  .setProject("6a6abdb7002586cbab5b");

export const account = new Account(client);


export const storage = new Storage(client);

export const APPWRITE_DATABASE_ID = "6a6ac03900298258eb94";
export const APPWRITE_DEVICES_COLLECTION_ID = "devices";
