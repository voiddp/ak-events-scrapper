import { Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, TextField } from "@mui/material";
import React, { useEffect, useMemo, useCallback, useState } from "react";
import { NamedEvent, WebEvent, EventsData, emptyEvent, SubmitEventProps, emptyNamedEvent } from "@/types/events";
import EventsSelector from "./EventsSelector";
import { formatNumber, getWidthFromValue, standardItemsSort, getItemBaseStyling } from "../utils/ItemUtils"
import ItemEditBox from "./ItemEditBox";
import useEvents from "@/utils/hooks/useEvents";

interface Props {
    open: boolean;
    onClose: () => void;
    variant: "tracker" | "builder" | "months";
    onSubmit: (submit: SubmitEventProps) => void;
    eventsData: EventsData;
    handledEvent: NamedEvent | WebEvent;
    selectedEvent?: NamedEvent;
    onSelectorChange?: (namedEvent: NamedEvent) => void
}

const SubmitEventDialog = (props: Props) => {
    const { open, onClose, variant, onSubmit, eventsData, handledEvent, selectedEvent, onSelectorChange } = props;

    const [rawMaterials, setRawMaterials] = useState<Record<string, number>>({});
    const [rawFarms, setRawFarms] = useState<string[]>([]);
    const [rawName, setRawName] = useState<string>('');
    const [isNumbersMatch, setisNumbersMatch] = useState<boolean>(true);
    const [replace, setReplace] = useState(false);
    const [focused, setFocused] = useState<string | false>(false);

    useEffect(() => {
        if (!open) return;
        setRawMaterials(handledEvent.materials ?? {});
        setRawFarms(handledEvent?.farms ?? []);
        setRawName(handledEvent.name ?? "")
        setisNumbersMatch(true);
        setFocused(false);
    }, [open, handledEvent, variant]);

    useEffect(() => {
        if (!open) return;
        if (selectedEvent && selectedEvent.index !== -1)
            setReplace(true);
        else
            setReplace(false);
    }, [open, selectedEvent]
    )

    //+months variant/selector handling
    const [selectedMonth, setSelectedMonth] = useState<NamedEvent>(emptyNamedEvent);
    const [, , , getNextMonthsData] = useEvents();

    const monthsData = useMemo(() => {
        return variant === "months" ? getNextMonthsData() : {};
    }, [variant, getNextMonthsData]);

    const materialsLimit = useMemo(() => {
        return variant === "months" ? selectedMonth.materials : handledEvent.materials;
    }, [variant, selectedMonth, handledEvent])

    const handleMonthsSelectorChange = (month: NamedEvent) => {
        setSelectedMonth(month);
        setRawMaterials(month.materials);
        setRawName(month.name);
    };
    //-months

    const handleInputChange = (id: string, value: number) => {

        setRawMaterials((prev) => {
            const newValue = Math.max(0, Math.min(value || 0, materialsLimit?.[id] ?? 0));
            const updated = { ...prev, [id]: newValue };

            const allValuesMatch = Object.entries(updated).every(
                ([key, val]) => val === (materialsLimit?.[key] ?? 0)
            );
            setisNumbersMatch(allValuesMatch);
            return updated;
        });
    };

    const handleDialogClose = useCallback(() => {
        setRawMaterials({});
        setRawFarms([]);
        setSelectedMonth(emptyNamedEvent);
        onClose();
    }, [onClose]);

    const handleSubmit = useCallback(() => {
        let {
            eventName,
            selectedEventIndex,
            materialsToDepot,
            materialsToEvent,
            farms,
            replaceName
        }: SubmitEventProps = {
            eventName: handledEvent.name ?? "",          // Default values
            selectedEventIndex: selectedEvent?.index ?? -1,
            materialsToDepot: [],
            materialsToEvent: Object.fromEntries(
                Object.entries(rawMaterials ?? {})
                    .filter(([_, quantity]) => quantity > 0)),
            farms: rawFarms,
            replaceName: false
        };

        /* eventName = handledEvent.name ?? "";
        selectedEventIndex = selectedEvent?.index ?? -1;
        materialsToDepot = [];
        materialsToEvent = Object.fromEntries(
            Object.entries(rawMaterials ?? {})
                .filter(([_, quantity]) => quantity > 0));
        farms = rawFarms; */

        switch (variant) {
            case "tracker":
                materialsToDepot = Object.entries(rawMaterials).filter(([_, value]) => value > 0);
                materialsToEvent = !isNumbersMatch
                    ? Object.fromEntries(
                        Object.entries(handledEvent.materials ?? {})
                            .map(([id, quantity]) => ([id, quantity - (rawMaterials[id] ?? 0)] as [string, number]))
                            .filter(([_, quantity]) => quantity > 0))
                    : false;
                break;

            case "builder":
                replaceName = replace ? rawName : false;
                break;

            case "months":
                eventName = selectedMonth.name;
                replaceName = replace ? selectedMonth.name : false;
                break;
            default:
        }
        console.log("handling:",
            eventName,
            selectedEventIndex,
            [...materialsToDepot],
            { ...materialsToEvent },
            [...farms],
            replaceName);
        onSubmit({
            eventName,
            selectedEventIndex,
            materialsToDepot,
            materialsToEvent,
            farms,
            replaceName,
        });
        handleDialogClose();
    }, [handleDialogClose, handledEvent, isNumbersMatch, onSubmit, rawFarms, rawMaterials, rawName, replace, selectedEvent, selectedMonth, variant]
    );

    const isSubmitDisabled = Object.values(rawMaterials).every((value) => value === 0) || rawName === "";

    const getTitle = (
        variant: Props["variant"],
        selectedEvent: Props["selectedEvent"],
        replace: boolean,
        isNumbersMatch: boolean,
        rawFarms: string[]
    ): string => {
        if (["builder", "months"].includes(variant)) {
            const baseTitle = "Event in Tracker";
            const optional = (selectedEvent?.index ?? -1) === -1
                ? "add/update"
                : replace ? "replace" : "add to";
            return [baseTitle, optional].filter(Boolean).join(" (") + (optional ? ")" : "");
        }

        if (variant === "tracker") {
            const baseTitle = "Add to Depot";
            const optional = `remove ${isNumbersMatch && rawFarms.length === 0 ? "" : "from "}Event`
            return [baseTitle, optional].filter(Boolean).join(" (") + (optional ? ")" : "");
        }

        return ""; // Fallback in case of unexpected variant
    };

    return (
        <Dialog open={open} onClose={handleDialogClose}>
            <DialogTitle>
                <Stack direction="column" width="100%" gap={1}>
                    {getTitle(variant, selectedEvent, replace, isNumbersMatch, rawFarms)}
                    <Stack direction="row" alignItems="stretch">
                        {variant !== 'months'
                            ? <TextField
                                value={rawName}
                                disabled={(variant !== "builder")}
                                onChange={(e) => {
                                    setRawName(e.target.value);
                                    if (rawName !== handledEvent.name && rawName !== '') {
                                        setReplace(true);
                                    } else {
                                        setReplace(false);
                                    }
                                }}
                                onFocus={(e) => e.target.select()}
                                size="small"
                                fullWidth
                                type="text"
                            />
                            : <EventsSelector
                                variant={variant}
                                eventsData={monthsData}
                                selectedEvent={selectedMonth}
                                onChange={handleMonthsSelectorChange}
                            />}
                        <Checkbox
                            disabled={selectedEvent?.index === -1 || variant === "tracker"}
                            checked={replace}
                            onChange={() => setReplace(!replace)} />
                    </Stack>
                </Stack>
            </DialogTitle>
            <DialogContent sx={{
                display: "flex",
                flexDirection: "row",
                flexWrap: "wrap"
            }}>
                {Object.keys(rawMaterials).length > 0 && (
                    <Stack direction="row" gap={0.7} flexWrap="wrap">
                        {Object.entries(rawMaterials)
                            .sort(([a], [b]) => standardItemsSort(a, b))
                            .map(([id, quantity]) => (
                                <ItemEditBox
                                    key={`${id}-itemEdit`}
                                    itemId={id}
                                    size={getItemBaseStyling("submit").itemBaseSize}
                                    value={quantity !== 0 ? (focused !== id ? formatNumber(quantity) : quantity) : ""}
                                    width={getWidthFromValue(quantity !== 0 ? (focused !== id ? formatNumber(quantity) : quantity) : "")}
                                    onFocus={() => {
                                        setFocused(id);
                                    }}
                                    onChange={(value) => handleInputChange(id, value)}
                                    onIconClick={(id) => {
                                        setFocused(id)
                                    }}
                                />
                            ))}
                    </Stack>
                )}
            </DialogContent>
            <DialogActions sx={{ gap: 1 }}>
                {(variant !== "tracker")
                    && <EventsSelector
                        variant="builder"
                        eventsData={eventsData}
                        selectedEvent={selectedEvent ?? emptyEvent}
                        onChange={onSelectorChange}
                    />
                }
                <Button disabled={isSubmitDisabled} onClick={handleSubmit} variant="contained">
                    Submit
                </Button>
                <Button onClick={handleDialogClose}>Cancel</Button>
            </DialogActions>
        </Dialog>
    );
};

export default SubmitEventDialog;