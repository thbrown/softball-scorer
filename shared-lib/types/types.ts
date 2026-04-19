import { Optimization, TopLevelClient } from "../types-gen/top-level-client";
import { TopLevelExport } from "../types-gen/top-level-export";
import { TopLevelFull } from "../types-gen/top-level-full";

export type AnyState = TopLevelFull | TopLevelClient | TopLevelExport;
export type Gender = "M" | "F";

export type CustomOptionsData = Optimization['customOptionsData'];
export type CustomOptionsDataValues = CustomOptionsData[keyof CustomOptionsData];