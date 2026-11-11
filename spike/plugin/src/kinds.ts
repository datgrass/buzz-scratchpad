/*
 * MIT License
 * 
 * Copyright (c) 2026 oloapiu
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

export const KIND_PROFILE = 0;
export const KIND_STREAM_MESSAGE = 9;
export const KIND_GIT_ISSUE = 1621;
export const KIND_STATUS_OPEN = 1630;
export const KIND_STATUS_RESOLVED = 1631;
export const KIND_STATUS_CLOSED = 1632;
export const KIND_STATUS_DRAFT = 1633;
export const KIND_CREATE_CHANNEL = 9007;
export const KIND_ADD_MEMBER = 9000;
export const KIND_CANVAS = 40100;
export const KIND_MANAGED_AGENT = 30177;
export const KIND_AGENT_PROFILE = 10100;
export const KIND_REPO_ANNOUNCEMENT = 30617;
export const KIND_GROUP_METADATA = 39000;
export const KIND_GROUP_MEMBERS = 39002;

export const STATUS_KINDS = [
  KIND_STATUS_OPEN,
  KIND_STATUS_RESOLVED,
  KIND_STATUS_CLOSED,
  KIND_STATUS_DRAFT,
];

export type Column = "triage" | "backlog" | "in_progress" | "in_review" | "done" | "closed";

export const COLUMNS: Column[] = ["triage", "backlog", "in_progress", "in_review", "done", "closed"];

export const COLUMN_LABELS: Record<Column, string> = {
  triage: "Triage",
  backlog: "Backlog",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
  closed: "Closed",
};
