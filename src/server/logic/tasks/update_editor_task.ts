import { Selectable, Transaction } from "kysely";
import { db } from "db";
import {
  Models,
  TaskAttachmentTable,
  TaskCreditTable,
  TaskDataTable,
  TaskSubtaskTable,
} from "common/types";
import {
  TaskAttachmentDTO,
  TaskCreditDTO,
  TaskDataDTO,
  TaskDTO,
  TaskSubtaskDTO,
} from "common/validation/task_validation";
import { normalizeAttachmentPath } from "common/utils/attachments";

type Ordered<T> = T & {
  order: number;
};

function makeOrdered<T>(arr: T[]): Ordered<T>[] {
  return arr.map((obj, index) => ({
    ...obj,
    order: index + 1,
  }));
}

async function upsertTaskCredits(
  trx: Transaction<Models>,
  taskId: string,
  credits: TaskCreditDTO[]
): Promise<Selectable<TaskCreditTable>[]> {
  const creditsOrdered = makeOrdered(credits);
  const creditsNew = creditsOrdered.filter((credit) => credit.id == null);
  const creditsOld = creditsOrdered.filter((credit) => credit.id != null);

  const creditsOldIds = creditsOld.map((credit) => credit.id as string);
  if (creditsOldIds.length <= 0) {
    await trx.deleteFrom("task_credits").where("task_id", "=", taskId).execute();
  } else {
    await trx
      .deleteFrom("task_credits")
      .where("task_id", "=", taskId)
      .where("id", "not in", creditsOldIds)
      .execute();
  }

  const dbCreditsNew =
    creditsNew.length <= 0
      ? []
      : await trx
          .insertInto("task_credits")
          .values(
            creditsNew.map((credit) => ({
              name: credit.name,
              role: credit.role,
              order: credit.order,
              task_id: taskId,
            }))
          )
          .returningAll()
          .execute();

  const dbCreditsUpdate =
    creditsOld.length <= 0
      ? []
      : await trx
          .insertInto("task_credits")
          .values(
            creditsOld.map((credit) => ({
              id: credit.id,
              name: credit.name,
              role: credit.role,
              order: credit.order,
              task_id: taskId,
            }))
          )
          .onConflict((oc) =>
            oc.column("id").doUpdateSet((eb) => ({
              name: eb.ref("excluded.name"),
              role: eb.ref("excluded.role"),
              order: eb.ref("excluded.order"),
              task_id: eb.ref("excluded.task_id"),
            }))
          )
          .returningAll()
          .execute();

  return [...dbCreditsNew, ...dbCreditsUpdate];
}

async function upsertTaskAttachments(
  trx: Transaction<Models>,
  taskId: string,
  attachments: TaskAttachmentDTO[]
): Promise<Selectable<TaskAttachmentTable>[]> {
  const attachmentsNew = attachments.filter((attachment) => attachment.id == null);
  const attachmentsOld = attachments.filter((attachment) => attachment.id != null);

  const attachmentsOldIds = attachmentsOld.map((attachment) => attachment.id as string);
  if (attachmentsOldIds.length <= 0) {
    await trx.deleteFrom("task_attachments").where("task_id", "=", taskId).execute();
  } else {
    await trx
      .deleteFrom("task_attachments")
      .where("task_id", "=", taskId)
      .where("id", "not in", attachmentsOldIds)
      .execute();
  }

  const dbAttachmentsNew =
    attachmentsNew.length <= 0
      ? []
      : await trx
          .insertInto("task_attachments")
          .values(
            attachmentsNew.map((attach) => ({
              path: normalizeAttachmentPath(attach.path),
              mime_type: attach.mime_type,
              file_hash: attach.file_hash,
              task_id: taskId,
            }))
          )
          .returningAll()
          .execute();

  const dbAttachmentsUpdate =
    attachmentsOld.length <= 0
      ? []
      : await trx
          .insertInto("task_attachments")
          .values(
            attachmentsOld.map((attach) => ({
              id: attach.id,
              path: attach.path,
              mime_type: attach.mime_type,
              file_hash: attach.file_hash,
              task_id: taskId,
            }))
          )
          .onConflict((oc) =>
            oc.column("id").doUpdateSet((eb) => ({
              path: eb.ref("excluded.path"),
              mime_type: eb.ref("excluded.mime_type"),
              file_hash: eb.ref("excluded.file_hash"),
              task_id: eb.ref("excluded.task_id"),
            }))
          )
          .returningAll()
          .execute();

  return [...dbAttachmentsNew, ...dbAttachmentsUpdate];
}

type UpsertTaskSubtasksResult = {
  subtasks: Selectable<TaskSubtaskTable>[];
  subtasksWithData: TaskSubtaskWithData[];
};

async function upsertTaskSubtasks(
  trx: Transaction<Models>,
  taskId: string,
  subtasks: TaskSubtaskDTO[]
): Promise<UpsertTaskSubtasksResult> {
  const subtasksOrdered = makeOrdered(subtasks);
  const subtasksNew = subtasksOrdered.filter((subtask) => subtask.id == null);
  const subtasksOld = subtasksOrdered.filter((subtask) => subtask.id != null);

  const subtasksOldIds = subtasksOld.map((subtask) => subtask.id as string);
  if (subtasksOldIds.length <= 0) {
    await trx.deleteFrom("task_subtasks").where("task_id", "=", taskId).execute();
  } else {
    await trx
      .deleteFrom("task_subtasks")
      .where("task_id", "=", taskId)
      .where("id", "not in", subtasksOldIds)
      .execute();
  }

  const dbSubtasksNew =
    subtasksNew.length <= 0
      ? []
      : await trx
          .insertInto("task_subtasks")
          .values(
            subtasksNew.map((subtask) => ({
              name: subtask.name,
              order: subtask.order,
              score_max: subtask.score_max,
              task_id: taskId,
            }))
          )
          .returningAll()
          .execute();

  const dbSubtasksOld =
    subtasksOld.length <= 0
      ? []
      : await trx
          .insertInto("task_subtasks")
          .values(
            subtasksOld.map((subtask) => ({
              id: subtask.id,
              name: subtask.name,
              order: subtask.order,
              score_max: subtask.score_max,
              task_id: taskId,
            }))
          )
          .onConflict((oc) =>
            oc.column("id").doUpdateSet((eb) => ({
              name: eb.ref("excluded.name"),
              order: eb.ref("excluded.order"),
              score_max: eb.ref("excluded.score_max"),
              task_id: eb.ref("excluded.task_id"),
            }))
          )
          .returningAll()
          .execute();

  const dataWithSubtaskIds: TaskSubtaskWithData[] = [];
  // Just mutate these guys in place!
  for (let i = 0; i < subtasksNew.length; i++) {
    const dto = subtasksNew[i];
    const dbs = dbSubtasksNew[i];
    dataWithSubtaskIds.push({
      id: dbs.id,
      data: dto.data,
    });
  }
  for (let i = 0; i < subtasksOld.length; i++) {
    const dto = subtasksOld[i];
    dataWithSubtaskIds.push({
      id: dto.id as string,
      data: dto.data,
    });
  }

  return {
    subtasks: [...dbSubtasksNew, ...dbSubtasksOld],
    subtasksWithData: dataWithSubtaskIds,
  };
}

type TaskSubtaskWithData = {
  id: string;
  data: TaskDataDTO[];
};

type TaskDataWithExtras = TaskDataDTO & {
  subtask_id: string;
  order: number;
};

async function upsertTaskData(
  trx: Transaction<Models>,
  subtasks: TaskSubtaskWithData[]
): Promise<Selectable<TaskDataTable>[]> {
  const dataAll: TaskDataWithExtras[] = subtasks.flatMap((sub) => {
    return sub.data.map((d, index) => ({
      ...d,
      subtask_id: sub.id,
      order: index + 1,
    }));
  });
  const dataNew = dataAll.filter((d) => d.id == null);
  const dataOld = dataAll.filter((d) => d.id != null);

  const subtaskIds = subtasks.map((subtask) => subtask.id);
  if (subtaskIds.length > 0) {
    const dataOldIds = dataOld.map((data) => data.id as string);
    if (dataOldIds.length <= 0) {
      await trx.deleteFrom("task_data").where("subtask_id", "in", subtaskIds).execute();
    } else {
      await trx
        .deleteFrom("task_data")
        .where("subtask_id", "in", subtaskIds)
        .where("id", "not in", dataOldIds)
        .execute();
    }
  }

  const dbDataNew =
    dataNew.length <= 0
      ? []
      : await trx
          .insertInto("task_data")
          .values(
            dataNew.map((data, index) => ({
              name: data.name,
              is_sample: data.is_sample,
              order: data.order,
              input_file_hash: data.input_file_hash,
              input_file_name: data.input_file_name,
              output_file_hash: data.output_file_hash,
              output_file_name: data.output_file_name,
              judge_file_hash: data.judge_file_hash,
              judge_file_name: data.judge_file_name,
              subtask_id: data.subtask_id,
            }))
          )
          .returningAll()
          .execute();

  const dbDataOld =
    dataOld.length <= 0
      ? []
      : await trx
          .insertInto("task_data")
          .values(
            dataOld.map((data) => ({
              id: data.id,
              name: data.name,
              is_sample: data.is_sample,
              order: data.order,
              input_file_hash: data.input_file_hash,
              input_file_name: data.input_file_name,
              output_file_hash: data.output_file_hash,
              output_file_name: data.output_file_name,
              judge_file_hash: data.judge_file_hash,
              judge_file_name: data.judge_file_name,
              subtask_id: data.subtask_id,
            }))
          )
          .onConflict((oc) =>
            oc.column("id").doUpdateSet((eb) => ({
              name: eb.ref("excluded.name"),
              is_sample: eb.ref("excluded.is_sample"),
              order: eb.ref("excluded.order"),
              input_file_hash: eb.ref("excluded.input_file_hash"),
              input_file_name: eb.ref("excluded.input_file_name"),
              output_file_hash: eb.ref("excluded.output_file_hash"),
              output_file_name: eb.ref("excluded.output_file_name"),
              judge_file_hash: eb.ref("excluded.judge_file_hash"),
              judge_file_name: eb.ref("excluded.judge_file_name"),
              subtask_id: eb.ref("excluded.subtask_id"),
            }))
          )
          .returningAll()
          .execute();

  return [...dbDataNew, ...dbDataOld];
}

export async function updateEditorTask(task: TaskDTO) {
  const result = await db.transaction().execute(async (trx) => {
    const dbTask = await trx
      .updateTable("tasks")
      .set({
        slug: task.slug,
        title: task.title,
        description: task.description ?? undefined,
        statement: task.statement,
        score_max: task.score_max,
      })
      .where("id", "=", task.id)
      .execute();

    const dbTaskCredits = await upsertTaskCredits(trx, task.id, task.credits);
    const dbTaskAttachments = await upsertTaskAttachments(trx, task.id, task.attachments);
    const { subtasks: dbSubtasks, subtasksWithData } = await upsertTaskSubtasks(
      trx,
      task.id,
      task.subtasks
    );
    const dbTaskData = await upsertTaskData(trx, subtasksWithData);
  });

  return task;
}
