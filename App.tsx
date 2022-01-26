import React from 'react';
import {
    View,
    Text,
    Button,
    TextInput,
    PermissionsAndroid,
    Platform,
    Alert
} from 'react-native';

import {
    Picker
} from '@react-native-picker/picker';

import {
    InterfaceType,
    StarConnectionSettings,
    StarXpandCommand,
    StarPrinter,
    StarDeviceDiscoveryManager as manager,
    StarDeviceDiscoveryManagerFactory
} from 'react-native-star-io10';

interface AppProps {
}

interface AppState {
    interfaceType: InterfaceType;
    identifier: string;
    imageBase64: string;
}

class App extends React.Component<AppProps, AppState> {
 
    async discover(): Promise<void> {
        try {
            // Specify your printer interface types.
           var manager = await StarDeviceDiscoveryManagerFactory.create([
                InterfaceType.Lan,
                InterfaceType.Bluetooth,
                InterfaceType.BluetoothLE,
                InterfaceType.Usb
            ]);
    
            // Set discovery time. (option)
            manager.discoveryTime = 10000;
    
            // Callback for printer found.
            manager.onPrinterFound = (printer: StarPrinter) => {
                console.log(printer);
                Alert.alert('Printer : ', printer);
                Alert.alert(`Printer found: ,${String(printer)}`)
                this.setState({printer:`${String(printer)}`})
            };
    
            // Callback for discovery finished. (option)
            manager.onDiscoveryFinished = () => {
                console.log(`1 Discovery finished.`);
                Alert.alert('1 Discovery finished.');
            };
    
            // Start discovery.
            await manager.startDiscovery();
    
            // Stop discovery.
            // await manager.stopDiscovery()
        }
        catch(error) {
            // Error.
            console.log(error);
            Alert.alert(`${String(error)}`);
            this.setState({error:`${String(error)}`})
        }
    }

    private _onPressPrintButton = async() => {
        var settings = new StarConnectionSettings();
        settings.interfaceType = this.state.interfaceType;
        settings.identifier = this.state.identifier;
        // settings.autoSwitchInterface = true;

        // If you are using Android 12 and targetSdkVersion is 31 or later,
        // you have to request Bluetooth permission (Nearby devices permission) to use the Bluetooth printer.
        // https://developer.android.com/about/versions/12/features/bluetooth-permissions
        if (Platform.OS == 'android' && 31 <= Platform.Version) {
            if (this.state.interfaceType == InterfaceType.Bluetooth || settings.autoSwitchInterface == true) {
                var hasPermission = await this._confirmBluetoothPermission();

                if (!hasPermission) {
                    console.log(`PERMISSION ERROR: You have to allow Nearby devices to use the Bluetooth printer`);
                    Alert.alert(`PERMISSION ERROR: You have to allow Nearby devices to use the Bluetooth printer`);
                    return;
                }
            }
        }

        var printer = new StarPrinter(settings);

        try {
            var builder = new StarXpandCommand.StarXpandCommandBuilder();
            builder.addDocument(new StarXpandCommand.DocumentBuilder()
            .addPrinter(new StarXpandCommand.PrinterBuilder()
                .actionPrintImage(new StarXpandCommand.Printer.ImageParameter("logo_01.png", 406))
                .styleInternationalCharacter(StarXpandCommand.Printer.InternationalCharacterType.Usa)
                .styleCharacterSpace(0)
                .styleAlignment(StarXpandCommand.Printer.Alignment.Center)
                .actionPrintText("Star Clothing Boutique\n" +
                                "123 Star Road\n" +
                                "City, State 12345\n" +
                                "\n")
                .styleAlignment(StarXpandCommand.Printer.Alignment.Left)
                .actionPrintText("Date:MM/DD/YYYY    Time:HH:MM PM\n" +
                                "--------------------------------\n" +
                                "\n")
                .actionPrintText("SKU         Description    Total\n" +
                                "300678566   PLAIN T-SHIRT  10.99\n" +
                                "300692003   BLACK DENIM    29.99\n" +
                                "300651148   BLUE DENIM     29.99\n" +
                                "300642980   STRIPED DRESS  49.99\n" +
                                "300638471   BLACK BOOTS    35.99\n" +
                                "\n" +
                                "Subtotal                  156.95\n" +
                                "Tax                         0.00\n" +
                                "--------------------------------\n")
                .actionPrintText("Total     ")
                .add(new StarXpandCommand.PrinterBuilder()
                    .styleMagnification(new StarXpandCommand.MagnificationParameter(2, 2))
                    .actionPrintText("   $156.95\n")
                )
                .actionPrintText("--------------------------------\n" +
                                "\n" +
                                "Charge\n" +
                                "156.95\n" +
                                "Visa XXXX-XXXX-XXXX-0123\n" +
                                "\n")
                .add(new StarXpandCommand.PrinterBuilder()
                    .styleInvert(true)
                    .actionPrintText("Refunds and Exchanges\n")
                )
                .actionPrintText("Within ")
                .add(new StarXpandCommand.PrinterBuilder()
                    .styleUnderLine(true)
                    .actionPrintText("30 days")
                )
                .actionPrintText(" with receipt\n")
                .actionPrintText("And tags attached\n" +
                                "\n")
                .styleAlignment(StarXpandCommand.Printer.Alignment.Center)
                .actionPrintBarcode(new StarXpandCommand.Printer.BarcodeParameter('0123456',
                                    StarXpandCommand.Printer.BarcodeSymbology.Jan8)
                                    .setBarDots(3)
                                    .setBarRatioLevel(StarXpandCommand.Printer.BarcodeBarRatioLevel.Level0)
                                    .setHeight(5)
                                    .setPrintHri(true))
                .actionFeedLine(1)
                .actionPrintQRCode(new StarXpandCommand.Printer.QRCodeParameter('Hello World.\n')
                                    .setModel(StarXpandCommand.Printer.QRCodeModel.Model2)
                                    .setLevel(StarXpandCommand.Printer.QRCodeLevel.L)
                                    .setCellSize(8))
                .actionCut(StarXpandCommand.Printer.CutType.Partial)
                )
            );

            var commands = await builder.getCommands();

            await printer.open();
            await printer.print(commands);

            console.log(`Success`);
        }
        catch(error) {
            console.log(`Error: ${String(error)}`);
        }
        finally {
            await printer.close();
            await printer.dispose();
        }
    }

    private async _confirmBluetoothPermission(): Promise<boolean> {
        var hasPermission = false;

        try {
            hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
    
            if (!hasPermission) {
                const status = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
                    
                hasPermission = status == PermissionsAndroid.RESULTS.GRANTED;
            }
        }
        catch (err) {
            console.warn(err);
        }

        return hasPermission;
    }

    constructor(props: any) {
        super(props);

        this.state = {
            interfaceType: InterfaceType.Lan,
            identifier: '00:11:62:00:00:00',
            imageBase64: '',
            printer: [],
            error:''
        };
    }

    render() {
        return (
            <View style={{ margin: 50 }}>
                <View style={{ flexDirection: 'row' }}>
                <Text style={{ width: 100 }}>Interface</Text>
                <Picker
                    style={{ width: 200, marginLeft: 20, justifyContent: 'center' }}
                    selectedValue={this.state.interfaceType}
                    onValueChange={(value) => {
                    this.setState({ interfaceType: value });
                    }}>
                    <Picker.Item label='LAN' value={InterfaceType.Lan} />
                    <Picker.Item label='Bluetooth' value={InterfaceType.Bluetooth}/>
                    <Picker.Item label='Bluetooth LE' value={InterfaceType.BluetoothLE}/>
                    <Picker.Item label='USB' value={InterfaceType.Usb} />
                </Picker>
                </View>
                <View style={{ flexDirection: 'row', marginTop: 30 }}>
                <Text style={{ width: 100 }}>Identifier</Text>
                <TextInput
                    style={{ width: 200, marginLeft: 20 }}
                    value={this.state.identifier}
                    onChangeText={(value) => {
                    this.setState({ identifier: value });
                    }}
                />
                </View>
                <View style={{ width: 100, marginTop: 20 }}>
                <Button
                    title="Print"
                    onPress={this._onPressPrintButton}
                    />
                    <Button title="Scan Printer" style={{ backgroundColor: 'red', width: "100%" }} onPress={this.discover}/>
                </View>
                <View>
                    <Text>
                        Interface : {this.state.interfaceType}
                    </Text>
                    <Text>
                      Identifier :  {this.state.identifier}
                    </Text>
                    <Text>
                      printer :  {this.state.printer}
                    </Text>
                    <Text>
                      error :  {this.state.error}
                    </Text>
                </View>
            </View>
        );
    }
};

export default App;