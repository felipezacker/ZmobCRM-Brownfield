-- CP-3.4: Add DELETE policy for prospecting_sessions (QA concern #2)
-- Only admins/directors can delete sessions (audit trail cleanup)

CREATE POLICY "Admins can delete org sessions"
  ON prospecting_sessions FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'director')
    )
  );
