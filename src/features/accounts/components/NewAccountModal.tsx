import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import type { Customer } from "../types";

export type NewAccountDraft = {
  department: string;
  name: string;
  owner: string;
  seats: number;
  workers: number;
};

type NewAccountModalProps = {
  customer: Customer;
  onClose: () => void;
  onCreateAccount: (draft: NewAccountDraft) => void;
};

export function NewAccountModal({ customer, onClose, onCreateAccount }: NewAccountModalProps) {
  const [department, setDepartment] = useState("");
  const [name, setName] = useState("");
  const [owner, setOwner] = useState("");
  const [seats, setSeats] = useState("12");
  const [workers, setWorkers] = useState("24");

  const isValid =
    department.trim().length > 1 &&
    name.trim().length > 2 &&
    owner.trim().length > 2 &&
    Number(seats) > 0 &&
    Number(workers) > 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValid) {
      return;
    }

    onCreateAccount({
      department: department.trim(),
      name: name.trim(),
      owner: owner.trim(),
      seats: Number(seats),
      workers: Number(workers),
    });
  }

  return (
    <div aria-labelledby="new-account-title" aria-modal="true" className="modal-backdrop" role="dialog">
      <form className="modal-panel" onSubmit={handleSubmit}>
        <div className="modal-header">
          <div>
            <h2 id="new-account-title">New Department Account</h2>
            <span>{customer.name}</span>
          </div>
          <button aria-label="Close" className="icon-only-button" onClick={onClose} type="button">
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="form-grid">
          <label className="field-stack">
            <span>Account name</span>
            <input
              onChange={(event) => setName(event.target.value)}
              placeholder="Motol Neonatology"
              value={name}
            />
          </label>

          <label className="field-stack">
            <span>Department</span>
            <input
              onChange={(event) => setDepartment(event.target.value)}
              placeholder="Neonatology"
              value={department}
            />
          </label>

          <label className="field-stack">
            <span>Owner</span>
            <input
              onChange={(event) => setOwner(event.target.value)}
              placeholder="Customer admin name"
              value={owner}
            />
          </label>

          <label className="field-stack">
            <span>Seats</span>
            <input min="1" onChange={(event) => setSeats(event.target.value)} type="number" value={seats} />
          </label>

          <label className="field-stack">
            <span>Workers</span>
            <input min="1" onChange={(event) => setWorkers(event.target.value)} type="number" value={workers} />
          </label>
        </div>

        <div className="modal-actions">
          <button className="button button-secondary" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="button button-primary" disabled={!isValid} type="submit">
            Create account
          </button>
        </div>
      </form>
    </div>
  );
}
