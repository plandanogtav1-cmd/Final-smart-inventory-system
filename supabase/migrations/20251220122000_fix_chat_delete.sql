-- Add missing DELETE policy for chat_history
CREATE POLICY "Users can delete their own chat history"
  ON chat_history FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);