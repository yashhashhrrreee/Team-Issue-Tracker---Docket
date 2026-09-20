"""add issue sequence number

Revision ID: b0b89f904f9c
Revises: f4347d5a29cf
Create Date: 2026-09-15 19:33:27.268147

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b0b89f904f9c'
down_revision = 'f4347d5a29cf'
branch_labels = None
depends_on = None


def upgrade():
    # number/next_issue_number added nullable first so existing rows can be
    # backfilled with real sequential numbers before the NOT NULL + unique
    # constraint are applied — a blind NOT NULL add would fail on any
    # pre-existing issue row (and would leave every project's counter at 1,
    # colliding with issue numbers that already exist).
    with op.batch_alter_table('issue', schema=None) as batch_op:
        batch_op.add_column(sa.Column('number', sa.Integer(), nullable=True))

    with op.batch_alter_table('project', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column('next_issue_number', sa.Integer(), nullable=False, server_default='1')
        )

    conn = op.get_bind()
    projects = conn.execute(sa.text("SELECT id FROM project")).fetchall()
    for (project_id,) in projects:
        issues = conn.execute(
            sa.text("SELECT id FROM issue WHERE project_id = :pid ORDER BY created_at ASC"),
            {"pid": project_id},
        ).fetchall()
        for i, (issue_id,) in enumerate(issues, start=1):
            conn.execute(
                sa.text("UPDATE issue SET number = :n WHERE id = :iid"),
                {"n": i, "iid": issue_id},
            )
        conn.execute(
            sa.text("UPDATE project SET next_issue_number = :n WHERE id = :pid"),
            {"n": len(issues) + 1, "pid": project_id},
        )

    with op.batch_alter_table('issue', schema=None) as batch_op:
        batch_op.alter_column('number', existing_type=sa.Integer(), nullable=False)
        batch_op.create_unique_constraint('uq_issue_project_number', ['project_id', 'number'])


def downgrade():
    with op.batch_alter_table('project', schema=None) as batch_op:
        batch_op.drop_column('next_issue_number')

    with op.batch_alter_table('issue', schema=None) as batch_op:
        batch_op.drop_constraint('uq_issue_project_number', type_='unique')
        batch_op.drop_column('number')
