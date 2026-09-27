import exampleData from "@/app/data-templates/exampleData.json";
import type { Account, Bill, Complaint } from "./account";

type RawAccount = {
  accountId: string;
  accountName: string;
  clientInfo: Account["clientInfo"];
  resources?: {
    billing?: Bill[] | object;
    complaints?: Complaint[] | object;
  };
  summary: Account["summary"];
};

function asList<T>(value: T[] | object | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export function exampleAccounts(): Account[] {
  return (exampleData as RawAccount[]).map((account) => ({
    accountId: account.accountId,
    accountName: account.accountName,
    clientInfo: account.clientInfo,
    summary: account.summary,
    resources: {
      billing: asList<Bill>(account.resources?.billing),
      complaints: asList<Complaint>(account.resources?.complaints),
    },
  }));
}
