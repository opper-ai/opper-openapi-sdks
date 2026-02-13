export type SdkFileType =
  | "package-config"
  | "types"
  | "client-base"
  | "client"
  | "index"
  | "readme"
  | "examples";

export interface VerifyError {
  file: string;
  line: number;
  message: string;
}

export interface LanguageProfile {
  name: string;
  extensions: string[];
  plannerInstructions: string;
  writerInstructions: string;
  verify?: {
    command: string[];
    parseErrors: (output: string) => VerifyError[];
  };
  fileTypes: SdkFileType[];
}
