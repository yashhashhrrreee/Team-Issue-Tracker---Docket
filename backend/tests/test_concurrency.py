"""Testing.md item 14: concurrent issue creation on the same project must
assign unique sequential numbers — a regression guard against a
MAX(number)+1-style read-then-write replacing the atomic
PROJECT.next_issue_number increment (Database.md §2). A race like that
won't necessarily fail on the first run, so this fires many overlapping
calls, across several rounds, rather than trusting a single pass.
"""
import threading

from app.issues import assign_issue_number

THREADS_PER_ROUND = 10  # stays within SQLAlchemy's default pool_size + overflow
ROUNDS = 5


def test_concurrent_issue_number_assignment_has_no_duplicates(app, base_fixtures):
    project_id = base_fixtures["project_id"]
    all_numbers = []

    for _ in range(ROUNDS):
        barrier = threading.Barrier(THREADS_PER_ROUND)
        results = []
        errors = []
        lock = threading.Lock()

        def worker():
            try:
                barrier.wait()  # line every thread up so calls actually overlap
                with app.app_context():
                    number = assign_issue_number(project_id)
                with lock:
                    results.append(number)
            except Exception as exc:  # noqa: BLE001
                with lock:
                    errors.append(exc)

        threads = [threading.Thread(target=worker) for _ in range(THREADS_PER_ROUND)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert not errors, f"worker thread(s) raised: {errors}"
        assert len(results) == THREADS_PER_ROUND
        assert len(set(results)) == THREADS_PER_ROUND, (
            f"duplicate issue numbers assigned in one round: {sorted(results)}"
        )
        all_numbers.extend(results)

    # Across all rounds combined, still no duplicate ever handed out for
    # this project — confirms the counter is durably atomic round to round,
    # not just accidentally unique within a single burst.
    assert len(all_numbers) == len(set(all_numbers))
