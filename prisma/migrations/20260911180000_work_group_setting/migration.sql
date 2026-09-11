-- Общая группа приёма заявок: задаётся командой /register_main и перекрывает
-- env WORK_GROUP_CHAT. Nullable — пока не задана, работает прежний env.
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "work_group_chat_id" BIGINT;
