
import sqlite3, json, copy
import pathlib
db = str(pathlib.Path(__file__).resolve().parent / "dev.db")
c = sqlite3.connect(db)
c.row_factory = sqlite3.Row

src = c.execute("SELECT * FROM layout_templates WHERE layout_template_id='TPL-ATR-CBD-SEAT-01'").fetchone()
seats = c.execute("SELECT seat_label, row_label, seat_number, position FROM event_seats WHERE event_id='EVT-ATR-001' ORDER BY row_label, seat_number").fetchall()
print("template sumber:", src["layout_template_id"], "| kursi sumber:", len(seats))

NEW = [
    ("VEN-ATR-002", "V2B", "Atrium Cileutik", "Atrium Cileutik - Sample Numbered Seat Map", "Lobby Alus", 9),
    ("VEN-ATR-003", "V2C", "Atrium Ciunik", "Atrium Ciunik - Sample Numbered Seat Map", "Indoor alternatif", 6),
]
for vid, code_, name, tplname, alias, page in NEW:
    if c.execute("SELECT 1 FROM venues WHERE venue_id=?", (vid,)).fetchone():
        print("  sudah ada:", vid); continue
    c.execute("""INSERT INTO venues (venue_id, venue_code, venue_name, venue_alias, venue_type, floor,
                 location_label, master_layout_version, status, capacity_validation_status, notes, created_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'))""",
              (vid, code_, name, alias, "INDOOR_ATRIUM", "GROUND_FLOOR", "Summarecon Mall Bandung",
               "1.0", "ACTIVE", "TBC_NOT_OFFICIALLY_VALIDATED",
               "Venue alternatif atrium sesuai blueprint; kapasitas resmi menunggu validasi pengelola."))
    tid = "TPL-" + vid.split("-")[-1] + "-SEAT-01"
    c.execute("""INSERT INTO layout_templates (layout_template_id, venue_id, template_code, template_name, version,
                 source_blueprint_page, selection, template_status, active_booking_types,
                 optional_booking_type_note, layout_elements, non_ticketable_elements, seat_grid_definition,
                 sections, alternative_layouts_not_selected)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
              (tid, vid, code_ + "-SEAT", tplname, "1.0", page, "ALTERNATIVE_ATRIUM", "PROTOTYPE_CONCEPT",
               src["active_booking_types"], src["optional_booking_type_note"],
               src["layout_elements"], src["non_ticketable_elements"], src["seat_grid_definition"],
               src["sections"], src["alternative_layouts_not_selected"]))
    print("  +", vid, name, "| template", tid)

c.commit()
print("\nvenue sekarang:")
for r in c.execute("SELECT venue_id, venue_code, venue_name FROM venues ORDER BY venue_id"):
    print("  ", tuple(r))
