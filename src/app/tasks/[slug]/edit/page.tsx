import { notFound, redirect } from "next/navigation";
import { TaskEditor } from "client/components/task_editor/task_editor";
import { getSession } from "server/sessions";
import { getEditorTask } from "server/logic/tasks/get_editor_task";
import { uuidToHuradoID } from "common/utils/uuid";


type TaskEditPageProps = {
  params: {
    slug: string;
  };
};

export default async function TaskEditPage(props: TaskEditPageProps) {
  const session = getSession();
  if (session == null || session.user.role != "admin") {
    return { errorCode: 403 };
  }

  const task = await getEditorTask(props.params.slug);

  if (task == null) {
    return notFound();
  }
  const hid = uuidToHuradoID(task.id);
  if (hid !== props.params.slug) {
    return redirect(`/tasks/${hid}/edit`);
  }

  return <TaskEditor dto={task} />;
}
