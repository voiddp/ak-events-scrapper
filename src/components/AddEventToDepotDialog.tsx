import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from "@mui/material";
import React, { useEffect, useState } from "react";
import ItemBase from "./ItemBase";
import { Event, EventsData, emptyEvent } from "@/types/events";
import EventsSelector from "./EventsSelector";

type NamedEvent = Event & {
    name: string;
};

interface Props {
    open: boolean;
    onClose: () => void;
    variant: "tracker" | "builder";
    onSubmit: (
        eventName: string,
        selectedEventIndex: number,
        materialsToDepot: [string, number][],
        materialsToEvent: Record<string, number> | false,
        farms: string[],
        newEventName: string | false,
    ) => void;
    eventsData: EventsData;
    handledEvent: NamedEvent;
    selectedEvent?: NamedEvent;
    onSelectorChange?: (namedEvent: NamedEvent) => void
}

const AddEventToDepotDialog = (props: Props) => {
    const { open, onClose, variant, onSubmit, eventsData, handledEvent, selectedEvent, onSelectorChange } = props;

    const [rawMaterials, setRawMaterials] = useState<Record<string, number>>({});
    const [rawFarms, setRawFarms] = useState<string[]>([]);
    const [rawName, setRawName] = useState<string>('');
    const [isNumbersMatch, setisNumbersMatch] = useState<boolean>(true);

    useEffect(() => {
        if (!open) return;
        setRawMaterials(handledEvent.materials ?? {});
        setRawFarms(handledEvent?.farms ?? []);
        setRawName(handledEvent.name ?? "")
        setisNumbersMatch(true);
    }, [open, handledEvent]);

    const handleInputChange = (id: string, value: number) => {
        setRawMaterials((prev) => {
            const newValue = Math.max(0, Math.min(value || 0, handledEvent.materials[id] ?? 0));
            const updated = { ...prev, [id]: newValue };

            const allValuesMatch = Object.entries(updated).every(
                ([key, val]) => val === (handledEvent.materials[key] ?? 0)
            );
            setisNumbersMatch(allValuesMatch);
            return updated;
        });
    };

    const handleDialogClose = () => {
        setRawMaterials({});
        setRawFarms([]);
        onClose();
    };

    const handleSubmit = () => {
        const _newName = isNameChanged ? rawName : false;

        const materialsToDepot = variant === "builder"
            ? []
            : Object.entries(rawMaterials).filter(([_, value]) => value > 0);
        let materialsToEvent: Record<string, number> | boolean = false;

        materialsToEvent = variant === "tracker" && !isNumbersMatch
            ? Object.fromEntries(
                Object.entries(handledEvent.materials ?? {})
                    .map(([id, quantity]) => ([id, quantity - (rawMaterials[id] ?? 0)] as [string, number]))
                    .filter(([_, quantity]) => quantity > 0)
            )
            : variant === "builder" &&
            Object.fromEntries(
                Object.entries(rawMaterials ?? {})
                    .filter(([_, quantity]) => quantity > 0));
        console.log(handledEvent.name, selectedEvent?.index ?? -1, materialsToDepot, materialsToEvent, rawFarms, _newName);
        onSubmit(handledEvent.name, selectedEvent?.index ?? -1, materialsToDepot, materialsToEvent, rawFarms, _newName);
        handleDialogClose();
    };

    const isSubmitDisabled = Object.values(rawMaterials).every((value) => value === 0);
    const isNameChanged = rawName != handledEvent.name && rawName != '';

    const getTitle = (
        variant: "tracker" | "builder",
        selectedEvent: NamedEvent | undefined,
        isNameChanged: boolean,
        isNumbersMatch: boolean,
        rawFarms: string[]
    ): string => {
        if (variant === "builder") {
            const baseTitle = (selectedEvent?.index ?? -1) === -1
                ? "New/Update event in Tracker"
                : "Add to Event in Tracker";
            const optional = isNameChanged ? "rename & replace" : null;
            return [baseTitle, optional].filter(Boolean).join(" (") + (optional ? ")" : "");
        }

        if (variant === "tracker") {
            const baseTitle = "Add to Depot";
            const optional = `remove ${isNumbersMatch && rawFarms.length === 0 ? "" : "from "}Event`
            return [baseTitle, optional].filter(Boolean).join(" (") + (optional ? ")" : "");
        }

        return ""; // Fallback in case of unexpected variant
    };

    const handleSelectorChange = (namedEvent: any) =>{

    }

    return (
        <Dialog open={open} onClose={handleDialogClose}>
            <DialogTitle>
                <Stack direction="column">
                    {getTitle(variant, selectedEvent, isNameChanged, isNumbersMatch, rawFarms)}
                    <TextField
                        value={rawName}
                        disabled={(variant != "builder")}
                        onChange={(e) => setRawName(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        size="small"
                        type="text"
                    />
                </Stack>
            </DialogTitle>
            <DialogContent sx={{
                display: "flex",
                flexDirection: "row",
                flexWrap: "wrap"
            }}>
                {Object.keys(rawMaterials).length > 0 && (
                    <>
                        {Object.entries(rawMaterials).map(([id, quantity]) => (
                            <Stack key={id} direction="row">
                                <ItemBase key={`${id}-item`} itemId={id} size={40 * 0.7} sx={{ zIndex: 2 }} />
                                <TextField
                                    value={quantity != 0 ? quantity : ""}
                                    key={`${id}-input`}
                                    onChange={(e) => handleInputChange(id, Number(e.target.value))}
                                    onFocus={(e) => e.target.select()}
                                    size="small"
                                    sx={{ ml: -2.5, zIndex: 1 }}
                                    type="number"
                                    slotProps={{
                                        htmlInput: {
                                            type: "text",
                                            sx: {
                                                textAlign: "right",
                                                width: "3.5ch",
                                                flexGrow: 1,
                                                color: "primary",
                                                fontWeight: "bolder",
                                            },
                                        },
                                    }}
                                />
                            </Stack>
                        ))}
                    </>
                )}
            </DialogContent>
            <DialogActions sx={{ gap: 1 }}>
                {(variant === "builder") 
                && <EventsSelector
                     variant='builder'
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

export default AddEventToDepotDialog;