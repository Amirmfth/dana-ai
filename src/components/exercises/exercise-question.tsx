type ExerciseType =
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "MULTIPLE_SELECT"
  | "MATCHING"
  | "ORDERING";

type ExerciseQuestionProps = {
  type: ExerciseType;

  data: unknown;

  value: unknown;

  disabled: boolean;

  onChange: (value: unknown) => void;
};

type Item = {
  id: string;
  label: string;
};

export function ExerciseQuestion({
  type,
  data,
  value,
  disabled,
  onChange,
}: ExerciseQuestionProps) {
  switch (type) {
    case "MULTIPLE_CHOICE":
      return (
        <MultipleChoice
          data={data}
          value={value}
          disabled={disabled}
          onChange={onChange}
        />
      );

    case "TRUE_FALSE":
      return (
        <TrueFalse value={value} disabled={disabled} onChange={onChange} />
      );

    case "MULTIPLE_SELECT":
      return (
        <MultipleSelect
          data={data}
          value={value}
          disabled={disabled}
          onChange={onChange}
        />
      );

    case "MATCHING":
      return (
        <Matching
          data={data}
          value={value}
          disabled={disabled}
          onChange={onChange}
        />
      );

    case "ORDERING":
      return (
        <Ordering
          data={data}
          value={value}
          disabled={disabled}
          onChange={onChange}
        />
      );
  }
}

function MultipleChoice({
  data,
  value,
  disabled,
  onChange,
}: {
  data: unknown;
  value: unknown;
  disabled: boolean;
  onChange: (value: unknown) => void;
}) {
  const options = getOptions(data);

  return (
    <div className="space-y-2">
      {options.map((option) => {
        const selected = value === option;

        return (
          <button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option)}
            className={optionClass(selected)}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function TrueFalse({
  value,
  disabled,
  onChange,
}: {
  value: unknown;
  disabled: boolean;
  onChange: (value: unknown) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[true, false].map((option) => (
        <button
          key={String(option)}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option)}
          className={optionClass(value === option)}
        >
          {option ? "True" : "False"}
        </button>
      ))}
    </div>
  );
}

function MultipleSelect({
  data,
  value,
  disabled,
  onChange,
}: {
  data: unknown;
  value: unknown;
  disabled: boolean;
  onChange: (value: unknown) => void;
}) {
  const options = getOptions(data);

  const selected = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

  function toggle(option: string) {
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option));

      return;
    }

    onChange([...selected, option]);
  }

  return (
    <div className="space-y-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          disabled={disabled}
          onClick={() => toggle(option)}
          className={optionClass(selected.includes(option))}
        >
          <span className="mr-3 inline-flex size-5 items-center justify-center rounded border border-current text-xs">
            {selected.includes(option) ? "✓" : ""}
          </span>

          {option}
        </button>
      ))}
    </div>
  );
}

function Matching({
  data,
  value,
  disabled,
  onChange,
}: {
  data: unknown;
  value: unknown;
  disabled: boolean;
  onChange: (value: unknown) => void;
}) {
  const parsed = getMatchingData(data);

  const selectedPairs = Array.isArray(value) ? value.filter(isPair) : [];

  function changeMatch(leftId: string, rightId: string) {
    const remaining = selectedPairs.filter((pair) => pair.leftId !== leftId);

    onChange([
      ...remaining,
      {
        leftId,
        rightId,
      },
    ]);
  }

  return (
    <div className="w-full min-w-0 space-y-3">
      {parsed.leftItems.map((left) => {
        const current = selectedPairs.find((pair) => pair.leftId === left.id);

        return (
          <div
            key={left.id}
            className="grid w-full min-w-0 gap-2 sm:grid-cols-2 sm:items-center"
          >
            <div className="min-w-0 break-words rounded-xl bg-neutral-100 px-4 py-3 text-sm font-medium dark:bg-neutral-900">
              {left.label}
            </div>

            <select
              disabled={disabled}
              value={current?.rightId ?? ""}
              onChange={(event) => changeMatch(left.id, event.target.value)}
              className="min-h-11 w-full min-w-0 max-w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-neutral-950 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-white"
            >
              <option value="">Choose match…</option>

              {parsed.rightItems.map((right) => (
                <option key={right.id} value={right.id}>
                  {right.label}
                </option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}

function Ordering({
  data,
  value,
  disabled,
  onChange,
}: {
  data: unknown;
  value: unknown;
  disabled: boolean;
  onChange: (value: unknown) => void;
}) {
  const items = getOrderingItems(data);

  const order =
    Array.isArray(value) && value.every((item) => typeof item === "string")
      ? value
      : items.map((item) => item.id);

  const orderedItems = order
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is Item => Boolean(item));

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;

    if (target < 0 || target >= order.length) {
      return;
    }

    const next = [...order];

    [next[index], next[target]] = [next[target], next[index]];

    onChange(next);
  }

  return (
    <div className="space-y-2">
      {orderedItems.map((item, index) => (
        <div
          key={item.id}
          className="flex items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3 dark:border-neutral-800"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold dark:bg-neutral-800">
            {index + 1}
          </span>

          <span className="min-w-0 flex-1 text-sm">{item.label}</span>

          <div className="flex gap-1">
            <button
              type="button"
              disabled={disabled || index === 0}
              onClick={() => move(index, -1)}
              aria-label="Move up"
              className="flex size-9 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-30 dark:border-neutral-700"
            >
              ↑
            </button>

            <button
              type="button"
              disabled={disabled || index === orderedItems.length - 1}
              onClick={() => move(index, 1)}
              aria-label="Move down"
              className="flex size-9 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-30 dark:border-neutral-700"
            >
              ↓
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function optionClass(selected: boolean) {
  return `w-full rounded-xl border px-4 py-3 text-left text-sm leading-6 transition ${
    selected
      ? "border-neutral-950 bg-neutral-100 dark:border-white dark:bg-neutral-800"
      : "border-neutral-200 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-500"
  }`;
}

function getOptions(data: unknown) {
  if (!data || typeof data !== "object" || !("options" in data)) {
    return [];
  }

  const options = (
    data as {
      options?: unknown;
    }
  ).options;

  return Array.isArray(options)
    ? options.filter((item): item is string => typeof item === "string")
    : [];
}

function getMatchingData(data: unknown): {
  leftItems: Item[];
  rightItems: Item[];
} {
  if (!data || typeof data !== "object") {
    return {
      leftItems: [],
      rightItems: [],
    };
  }

  const value = data as {
    leftItems?: unknown;
    rightItems?: unknown;
  };

  return {
    leftItems: parseItems(value.leftItems),

    rightItems: parseItems(value.rightItems),
  };
}

function getOrderingItems(data: unknown) {
  if (!data || typeof data !== "object" || !("items" in data)) {
    return [];
  }

  return parseItems(
    (
      data as {
        items?: unknown;
      }
    ).items,
  );
}

function parseItems(value: unknown): Item[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is Item =>
    Boolean(
      item &&
      typeof item === "object" &&
      "id" in item &&
      typeof (
        item as {
          id?: unknown;
        }
      ).id === "string" &&
      "label" in item &&
      typeof (
        item as {
          label?: unknown;
        }
      ).label === "string",
    ),
  );
}

function isPair(value: unknown): value is {
  leftId: string;
  rightId: string;
} {
  return Boolean(
    value &&
    typeof value === "object" &&
    "leftId" in value &&
    typeof (
      value as {
        leftId?: unknown;
      }
    ).leftId === "string" &&
    "rightId" in value &&
    typeof (
      value as {
        rightId?: unknown;
      }
    ).rightId === "string",
  );
}
